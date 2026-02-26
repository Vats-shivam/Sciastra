import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import colors from "../config/colors";
import Header from "../components/Header";
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import ConnectionApi from "../api/ConnectionApi";
import chatApi from "../api/ChatApi";
import postApi from "../api/PostApi";
import { useLoader } from "../context/LoaderContext";
import useScreenApiLogger from "../hooks/useScreenApiLogger";
import { getProfileImageSource } from "../utils/profileImage";
import CustomRefreshControl from "../components/CustomRefreshControl";


const PEOPLE_CATEGORIES = [
  { id: "invites", label: "Invites", icon: "account-plus" },
  { id: "connections", label: "Connections", icon: "account-group" },
];

const ConnectionsScreen = () => {
  const navigation = useNavigation();
  const { showLoader, hideLoader } = useLoader();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("invites");
  const [showMoreConnections, setShowMoreConnections] = useState(false);
  const [showMoreInvites, setShowMoreInvites] = useState(false);
  
  // Real data from API
  const [connections, setConnections] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [profileImageErrors, setProfileImageErrors] = useState({});
  const searchTimeout = useRef(null);

  useScreenApiLogger("People");

  // Load data when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [connectionsResult, requestsResult] = await Promise.all([
        ConnectionApi.getConnections(1, 50), // Get first 50 connections
        ConnectionApi.getReceivedRequests(1, 50), // Get first 50 received requests
      ]);

      if (connectionsResult.success) {
        // Transform API data to match our component structure
        const transformedConnections = connectionsResult.data.connections?.map(conn => ({
          id: conn.user.id,
          name: conn.user.name || 'Unknown',
          designation: conn.user.profession || 'No designation',
          profilePic: conn.user.profilePic,
          mutualConnections: 0, // API doesn't provide this yet
          connectionId: conn.id,
          user: conn.user,
        })) || [];
        setConnections(transformedConnections);
      } else {
        console.warn('Failed to load connections:', connectionsResult.error);
        setConnections([]); // Set empty array if API fails
      }

      if (requestsResult.success) {
        // Transform API data to match our component structure
        const transformedRequests = requestsResult.data.connections?.map(req => ({
          id: req.user.id,
          name: req.user.name || 'Unknown',
          designation: req.user.profession || 'No designation',
          profilePic: req.user.profilePic,
          connectionId: req.id,
          status: req.status,
          user: req.user,
        })) || [];
        setReceivedRequests(transformedRequests);
      } else {
        console.warn('Failed to load received requests:', requestsResult.error);
        setReceivedRequests([]); // Set empty array if API fails
      }
    } catch (error) {
      console.error('Error loading connection data:', error);
      // Set empty arrays if API fails
      setConnections([]);
      setReceivedRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Server-side search for users
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    
    // Clear existing timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // If query is empty, clear search results
    if (!query.trim()) {
      setSearching(false);
      setSearchResults([]);
      return;
    }

    // Debounce search with 500ms delay
    searchTimeout.current = setTimeout(async () => {
      try {
        setSearching(true);
        console.log('Searching users for:', query);
        
        // Use PostApi to search users
        const result = await postApi.search(query, 'users', 1, 50);
        
        if (result.success) {
          // Transform search results to match our component structure
          const users = result.data?.users || result.data || [];
          const transformedUsers = users.map(user => ({
            id: user.userId || user.id,
            name: user.name || 'Unknown',
            designation: user.profession || user.designation || 'No designation',
            profilePic: user.profilePic,
            mutualConnections: user.mutualConnections || 0,
            user,
          }));
          
          console.log('User search results:', transformedUsers.length, 'users');
          setSearchResults(transformedUsers);
        } else {
          console.error('User search failed:', result.message);
          setSearchResults([]);
        }
      } catch (error) {
        console.error('User search error:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
  }, []);

  // Use search results if available, otherwise use local filtering
  const filteredConnections = useMemo(() => {
    if (searchQuery.trim() && searchResults.length > 0) {
      return searchResults;
    }
    if (searchQuery.trim() && !searching) {
      // Client-side fallback if server search returns empty
      return connections.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.designation.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return connections;
  }, [connections, searchQuery, searchResults, searching]);

  const filteredInvites = useMemo(() => {
    if (searchQuery.trim() && searchResults.length > 0) {
      return searchResults.filter(result => 
        receivedRequests.some(req => req.id === result.id)
      );
    }
    if (searchQuery.trim() && !searching) {
      // Client-side fallback
      return receivedRequests.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.designation.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return receivedRequests;
  }, [receivedRequests, searchQuery, searchResults, searching]);

  const handleMessagePress = async (connection) => {
    try {
      showLoader();
      console.log('Starting chat with connection:', connection);

      // Create or get direct chat room with this user
      const chatResult = await chatApi.createOrGetDirectChat(connection.id);

      if (chatResult.success) {
        console.log('Chat room created/found:', chatResult.data);

        // Navigate to OneToOneChat screen with user details
        navigation.navigate('OneToOneChat', {
          userId: connection.id,
          userName: connection.name,
          avatar: connection.profilePic,
          isOnline: true, // Default to online since we don't have real-time status yet
          roomId: chatResult.data.id,
        });
      } else {
        console.error('Failed to create/get chat room:', chatResult.message);
        Alert.alert('Error', 'Failed to start chat. Please try again.');
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      Alert.alert('Error', 'Failed to start chat. Please try again.');
    } finally {
      hideLoader();
    }
  };

  const handleSendConnectionRequest = async (userId, userName) => {
    try {
      showLoader();
      const result = await ConnectionApi.sendConnectionRequest(userId);
      if (result.success) {
        Alert.alert('Success', `Connection request sent to ${userName}!`);
        // Refresh data to update the lists
        await loadData();
      } else {
        Alert.alert('Error', result.error || 'Failed to send connection request');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send connection request');
    } finally {
      hideLoader();
    }
  };

  const renderConnection = useCallback(({ item }) => {
    // Check if this user is already a connection
    const isConnection = connections.some(conn => conn.id === item.id);
    const hasRequestPending = receivedRequests.some(req => req.id === item.id);
    
    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => {
          // Check if this is the current user
          if (item.id === '1') { // Current user ID is '1'
            navigation.navigate("ProfileTab");
          } else {
            navigation.navigate("UserProfile", { userId: item.id });
          }
        }}
      >
        <Image
          source={
            profileImageErrors[item.id]
              ? require("../assets/scix.png")
              : getProfileImageSource(item.user || item, { 
                  fallbackKey: item.profilePic || item.user?.profilePic || item.user?.profile?.profilePic 
                })
          }
          style={styles.avatar}
          resizeMode="cover"
          defaultSource={require("../assets/scix.png")}
          onError={() =>
            setProfileImageErrors((prev) => ({ ...prev, [item.id]: true }))
          }
        />
        <View style={styles.userInfoContainer}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.designation}>{item.designation}</Text>
          {item.mutualConnections > 0 && (
            <Text style={styles.mutual}>
              {item.mutualConnections} mutual {item.mutualConnections === 1 ? 'connection' : 'connections'}
            </Text>
          )}
        </View>
        <View style={styles.actionContainer}>
          {isConnection ? (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleMessagePress(item)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>Message</Text>
            </TouchableOpacity>
          ) : hasRequestPending ? (
            <View style={styles.pendingBtn}>
              <Text style={styles.pendingText}>Pending</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.connectBtn}
              onPress={() => handleSendConnectionRequest(item.id, item.name)}
              activeOpacity={0.8}
            >
              <Icon name="account-plus" size={18} color={colors.white} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [connections, receivedRequests]);

  const handleAcceptRequest = async (connectionId, userName) => {
    try {
      showLoader();
      const result = await ConnectionApi.acceptConnectionRequest(connectionId);
      if (result.success) {
        Alert.alert('Success', `Connection request from ${userName} accepted!`);
        // Refresh data to update the lists
        await loadData();
      } else {
        Alert.alert('Error', result.error || 'Failed to accept connection request');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to accept connection request');
    } finally {
      hideLoader();
    }
  };

  const handleRejectRequest = async (connectionId, userName) => {
    try {
      showLoader();
      const result = await ConnectionApi.rejectConnectionRequest(connectionId);
      if (result.success) {
        Alert.alert('Success', `Connection request from ${userName} rejected`);
        // Refresh data to update the lists
        await loadData();
      } else {
        Alert.alert('Error', result.error || 'Failed to reject connection request');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to reject connection request');
    } finally {
      hideLoader();
    }
  };

  const renderInvite = useCallback(({ item }) => {
    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => {
          // Check if this is the current user
          if (item.id === '1') { // Current user ID is '1'
            navigation.navigate("ProfileTab");
          } else {
            navigation.navigate("UserProfile", { userId: item.id });
          }
        }}
      >
        <Image
          source={
            profileImageErrors[item.id]
              ? require("../assets/scix.png")
              : getProfileImageSource(item.user || item, { 
                  fallbackKey: item.profilePic || item.user?.profilePic || item.user?.profile?.profilePic 
                })
          }
          style={styles.avatar}
          resizeMode="cover"
          defaultSource={require("../assets/scix.png")}
          onError={() =>
            setProfileImageErrors((prev) => ({ ...prev, [item.id]: true }))
          }
        />
        <View style={styles.userInfoContainer}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.designation}>{item.designation}</Text>
        </View>
        <View style={styles.inviteActionContainer}>
          <TouchableOpacity 
            style={styles.acceptBtn}
            onPress={() => handleAcceptRequest(item.connectionId, item.name)}
            activeOpacity={0.8}
          >
            <Icon name="check" size={20} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.ignoreBtn}
            onPress={() => handleRejectRequest(item.connectionId, item.name)}
            activeOpacity={0.8}
          >
            <Icon name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, []);

  const renderSearchBar = () => (
    <View style={styles.searchBarContainer}>
      <View style={styles.searchIconContainer}>
        <Icon name="magnify" size={20} color={colors.textMuted} />
      </View>
      <TextInput
        style={styles.searchBar}
        placeholder="Search connections & people..."
        placeholderTextColor={colors.textMuted}
        value={searchQuery}
        onChangeText={handleSearch}
        returnKeyType="search"
        autoCorrect={false}
      />
      {searching && (
        <View style={styles.searchActionContainer}>
          <Icon name="loading" size={18} color={colors.button} />
        </View>
      )}
      {searchQuery.length > 0 && !searching && (
        <TouchableOpacity 
          onPress={() => handleSearch('')}
          style={styles.searchActionContainer}
          activeOpacity={0.7}
        >
          <Icon name="close-circle" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderCategoryTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabsContainer}
    >
      {PEOPLE_CATEGORIES.map((cat) => (
        <TouchableOpacity
          key={cat.id}
          style={[
            styles.catChip,
            activeCategory === cat.id && styles.catChipActive,
          ]}
          onPress={() => setActiveCategory(cat.id)}
          activeOpacity={0.7}
        >
          <View style={[
            styles.catIconContainer,
            activeCategory === cat.id && styles.catIconContainerActive
          ]}>
            <Icon
              name={cat.icon}
              size={16}
              color={activeCategory === cat.id ? colors.white : colors.textSecondary}
            />
          </View>
          <Text style={[styles.catText, activeCategory === cat.id && styles.catTextActive]}>
            {cat.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderPeopleList = () => {
    const isInvites = activeCategory === "invites";
    const dataToShow = isInvites
      ? (showMoreInvites ? filteredInvites : filteredInvites.slice(0, 5))
      : (showMoreConnections ? filteredConnections : filteredConnections.slice(0, 10));

    const hasMore = isInvites
      ? filteredInvites.length > 5
      : filteredConnections.length > 10;

    const toggleShowMore = () => {
      if (isInvites) {
        setShowMoreInvites(prev => !prev);
      } else {
        setShowMoreConnections(prev => !prev);
      }
    };

    const emptyIcon = isInvites ? "account-clock" : "account-group";
    const emptyTitle = isInvites ? "No connection requests" : "No connections yet";
    const emptySubtitle = isInvites
      ? "New requests will appear here"
      : "Connect with people to see them here";

    return (
      <FlatList
        data={dataToShow}
        keyExtractor={(item) => item.id}
        renderItem={isInvites ? renderInvite : renderConnection}
        refreshControl={
          <CustomRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {renderSearchBar()}
            {renderCategoryTabs()}
          </View>
        }
        ListFooterComponent={
          hasMore ? (
            <TouchableOpacity onPress={toggleShowMore} style={styles.showMoreBtn}>
              <Text style={styles.showMoreText}>
                {isInvites
                  ? (showMoreInvites ? "Show less" : "Show more")
                  : (showMoreConnections ? "Show less" : "Show more")}
              </Text>
            </TouchableOpacity>
          ) : <View style={styles.footerSpacer} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name={emptyIcon} size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>{emptyTitle}</Text>
            <Text style={styles.emptySubText}>{emptySubtitle}</Text>
          </View>
        }
        contentContainerStyle={styles.listContentNew}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <View style={styles.screen}>
      <Header title="PEOPLE" />
      {renderPeopleList()}
    </View>
  );
};

export default ConnectionsScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 4,
    paddingVertical: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  searchBar: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: 'Gilroy-Medium',
    paddingVertical: 8,
  },
  searchActionContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  listContentNew: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  tabsContainer: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    marginBottom: 8,
    marginTop: 12,
    color: colors.textPrimary,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 2,
    borderColor: colors.border,
    borderWidth: 2,
    borderColor: colors.border,
  },
  userInfoContainer: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    fontFamily: 'Gilroy-SemiBold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  designation: {
    fontSize: 13,
    fontFamily: 'Gilroy-Regular',
    color: colors.textMuted,
    marginBottom: 4,
  },
  mutual: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: colors.textMuted,
  },
  actionContainer: {
    alignItems: 'flex-end',
  },
  inviteActionContainer: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    backgroundColor: colors.button,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: colors.white,
    fontFamily: 'Gilroy-SemiBold',
    fontSize: 13,
  },
  connectBtn: {
    backgroundColor: colors.button,
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingBtn: {
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingText: {
    color: colors.textMuted,
    fontFamily: 'Gilroy-SemiBold',
    fontSize: 12,
  },
  acceptBtn: {
    backgroundColor: colors.success,
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ignoreBtn: {
    backgroundColor: colors.card,
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showMoreBtn: {
    alignItems: "center",
    paddingVertical: 16,
    marginTop: 8,
  },
  showMoreText: {
    color: colors.button,
    fontFamily: 'Gilroy-SemiBold',
    fontSize: 14,
  },
  footerSpacer: {
    height: 32,
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 10,
    minHeight: 44,
  },
  catChipActive: { 
    backgroundColor: 'rgba(138, 43, 226, 0.15)',
    borderColor: colors.button,
  },
  catIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  catIconContainerActive: {
    backgroundColor: colors.button,
  },
  catText: { 
    color: colors.textPrimary, 
    fontFamily: 'Gilroy-SemiBold',
    fontSize: 14,
  },
  catTextActive: { 
    color: colors.button,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: colors.textPrimary,
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  manageBtnText: {
    marginLeft: 6,
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
});