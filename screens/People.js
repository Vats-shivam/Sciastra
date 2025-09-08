import React, { useState, useMemo, useCallback, useEffect } from "react";
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
import Container from "../components/Container";
import Header from "../components/Header";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import ConnectionApi from "../api/ConnectionApi";
import { useLoader } from "../context/LoaderContext";

// Mock data as fallback
const mockConnections = Array.from({ length: 50 }, (_, i) => ({
  id: `${i + 1}`,
  name: `Connection ${i + 1}`,
  designation: i % 2 === 0 ? "Software Engineer" : "Designer",
  profilePic: null,
  mutualConnections: Math.floor(Math.random() * 10), // mocked
}));

const mockInvites = Array.from({ length: 30 }, (_, i) => ({
  id: `${i + 51}`,
  name: `Invite ${i + 1}`,
  designation: i % 3 === 0 ? "Student" : "Product Manager",
  profilePic: null,
}));

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
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
        })) || [];
        setConnections(transformedConnections);
      } else {
        console.warn('Failed to load connections:', connectionsResult.error);
        setConnections(mockConnections); // Fallback to mock data
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
        })) || [];
        setReceivedRequests(transformedRequests);
      } else {
        console.warn('Failed to load received requests:', requestsResult.error);
        setReceivedRequests(mockInvites); // Fallback to mock data
      }
    } catch (error) {
      console.error('Error loading connection data:', error);
      // Use mock data as fallback
      setConnections(mockConnections);
      setReceivedRequests(mockInvites);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filteredConnections = useMemo(
    () =>
      connections.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.designation.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [connections, searchQuery]
  );

  const filteredInvites = useMemo(
    () =>
      receivedRequests.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.designation.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [receivedRequests, searchQuery]
  );

  const renderConnection = useCallback(({ item }) => {
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
            item.profilePic
              ? { uri: item.profilePic }
              : require("../assets/icon.png")
          }
          style={styles.avatar}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.designation}>{item.designation}</Text>
          <Text style={styles.mutual}>
            {item.mutualConnections} mutual connections
          </Text>
        </View>
        <TouchableOpacity style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>Message</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }, []);

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
            item.profilePic
              ? { uri: item.profilePic }
              : require("../assets/icon.png")
          }
          style={styles.avatar}
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

  const renderCategoryTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 12 }}
      style={{ marginTop: 10 }}
    >
      {PEOPLE_CATEGORIES.map((cat, idx) => (
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

  const renderContent = () => {
    if (activeCategory === "invites") {
      return (
        <>
          <FlatList
            data={
              showMoreInvites ? filteredInvites : filteredInvites.slice(0, 5)
            }
            keyExtractor={(item) => item.id}
            renderItem={renderInvite}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="account-clock" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No connection requests</Text>
                <Text style={styles.emptySubText}>New requests will appear here</Text>
              </View>
            }
          />
          {filteredInvites.length > 5 && (
            <TouchableOpacity
              onPress={() => setShowMoreInvites(!showMoreInvites)}
              style={styles.showMoreBtn}
            >
              <Text style={styles.showMoreText}>
                {showMoreInvites ? "Show less" : "Show more"}
              </Text>
            </TouchableOpacity>
          )}
        </>
      );
    } else {
      return (
        <>
          <FlatList
            data={
              showMoreConnections
                ? filteredConnections
                : filteredConnections.slice(0, 10)
            }
            keyExtractor={(item) => item.id}
            renderItem={renderConnection}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="account-group" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No connections yet</Text>
                <Text style={styles.emptySubText}>Connect with people to see them here</Text>
              </View>
            }
          />
          {filteredConnections.length > 10 && (
            <TouchableOpacity
              onPress={() => setShowMoreConnections(!showMoreConnections)}
              style={styles.showMoreBtn}
            >
              <Text style={styles.showMoreText}>
                {showMoreConnections ? "Show less" : "Show more"}
              </Text>
            </TouchableOpacity>
          )}
        </>
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <Header title="PEOPLE" />
      
      <Container style={styles.container}>
        {/* Header Actions */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.manageBtn}
            onPress={() => navigation.navigate('ConnectionRequests')}
          >
            <Icon name="cog" size={20} color={colors.primary} />
            <Text style={styles.manageBtnText}>Manage Requests</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <TextInput
          style={styles.searchBar}
          placeholder="Search connections & invites..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {/* Category Tabs */}
        {renderCategoryTabs()}

        {/* Content based on selected category */}
        {renderContent()}
      </Container>
    </View>
  );
};

export default ConnectionsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  searchBar: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.white,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
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
    fontWeight: "600",
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
    fontWeight: "600",
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
    fontWeight: "600",
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
    fontWeight: "600",
  },
  showMoreBtn: {
    alignItems: "center",
    paddingVertical: 6,
  },
  showMoreText: {
    color: colors.secondary, // softer cyan for "show more"
    fontWeight: "600",
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
    marginBottom: 30,
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