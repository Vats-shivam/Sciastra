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
  RefreshControl,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import colors from "../config/colors";
import Header from "../components/Header";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import ConnectionApi from "../api/ConnectionApi";
import chatApi from "../api/ChatApi";
import postApi from "../api/PostApi";
import { useLoader } from "../context/LoaderContext";
import useScreenApiLogger from "../hooks/useScreenApiLogger";
import { getProfileImageSource } from "../utils/profileImage";


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
            navigation.navigate("Profile");
          } else {
            navigation.navigate("UserProfile", { userId: item.id });
          }
        }}
      >
        <Image
          source={
            profileImageErrors[item.id]
              ? require("../assets/icon.png")
              : getProfileImageSource(item.user || { profilePic: item.profilePic }, { fallbackKey: item.profilePic })
          }
          style={styles.avatar}
          resizeMode="cover"
          defaultSource={require("../assets/icon.png")}
          onError={() =>
            setProfileImageErrors((prev) => ({ ...prev, [item.id]: true }))
          }
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.designation}>{item.designation}</Text>
          <Text style={styles.mutual}>
            {item.mutualConnections} mutual connections
          </Text>
        </View>
        {isConnection ? (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleMessagePress(item)}
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
          >
            <Icon name="account-plus" size={18} color={colors.white} />
          </TouchableOpacity>
        )}
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
            navigation.navigate("Profile");
          } else {
            navigation.navigate("UserProfile", { userId: item.id });
          }
        }}
      >
        <Image
          source={
            profileImageErrors[item.id]
              ? require("../assets/icon.png")
              : getProfileImageSource(item.user || { profilePic: item.profilePic }, { fallbackKey: item.profilePic })
          }
          style={styles.avatar}
          resizeMode="cover"
          defaultSource={require("../assets/icon.png")}
          onError={() =>
            setProfileImageErrors((prev) => ({ ...prev, [item.id]: true }))
          }
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.designation}>{item.designation}</Text>
        </View>
        <View style={{ flexDirection: "row" }}>
          <TouchableOpacity 
            style={styles.acceptBtn}
            onPress={() => handleAcceptRequest(item.connectionId, item.name)}
          >
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.ignoreBtn}
            onPress={() => handleRejectRequest(item.connectionId, item.name)}
          >
            <Text style={styles.ignoreText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, []);

  const renderSearchBar = () => (
    <View style={styles.searchBarContainer}>
      <Icon name="magnify" size={22} color={colors.textMuted} style={styles.searchIcon} />
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
        <Icon name="loading" size={20} color={colors.primary} style={styles.searchActionIcon} />
      )}
      {searchQuery.length > 0 && !searching && (
        <TouchableOpacity onPress={() => handleSearch('')}>
          <Icon name="close-circle" size={20} color={colors.textMuted} style={styles.searchActionIcon} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderCategoryTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 12 }}
      style={{ marginTop: 4 }}
    >
      {PEOPLE_CATEGORIES.map((cat) => (
        <TouchableOpacity
          key={cat.id}
          style={[
            styles.catChip,
            activeCategory === cat.id && styles.catChipActive,
          ]}
          
          onPress={() => setActiveCategory(cat.id)}
        >
          <Icon
            name={cat.icon}
            size={18}
            color={activeCategory === cat.id ? colors.black : colors.textPrimary}
          />
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
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
    backgroundColor: colors.backgroundElevated,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  listContentNew: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchBar: {
    flex: 1,
    color: colors.white,
    fontSize: 16,
  },
  searchActionIcon: {
    marginLeft: 8,
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
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: colors.black,
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    width: '100%',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: colors.borderLight, // fallback if no image
  },
  name: {
    fontSize: 16,
    fontFamily: 'Gilroy-SemiBold',
    color: colors.textPrimary,
  },
  designation: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  mutual: {
    fontSize: 12,
    color: colors.textMuted,
  },
  actionBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnText: {
    color: colors.textInverse,
    fontFamily: 'Gilroy-SemiBold',
  },
  connectBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingBtn: {
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pendingText: {
    color: colors.textMuted,
    fontFamily: 'Gilroy-SemiBold',
    fontSize: 12,
  },
  acceptBtn: {
    backgroundColor: colors.success,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
  },
  acceptText: {
    color: colors.textInverse,
    fontFamily: 'Gilroy-SemiBold',
  },
  ignoreBtn: {
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  ignoreText: {
    color: colors.textMuted,
    fontFamily: 'Gilroy-SemiBold',
  },
  showMoreBtn: {
    alignItems: "center",
    paddingVertical: 6,
  },
  showMoreText: {
    color: colors.secondary, // softer cyan for "show more"
    fontFamily: 'Gilroy-SemiBold',
  },
  footerSpacer: {
    height: 32,
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 10,
    height: 42,
    marginBottom: 8,
  },
  catChipActive: { backgroundColor: colors.white },
  catText: { marginLeft: 8, color: colors.textPrimary, fontWeight: "600" },
  catTextActive: { 
    color: colors.black 
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: colors.textSecondary,
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