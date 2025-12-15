import React, { useState, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import colors from '../config/colors';
import Container from '../components/Container';
import Header from '../components/Header';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ConnectionApi from '../api/ConnectionApi';
import { useLoader } from '../context/LoaderContext';
import useScreenApiLogger from '../hooks/useScreenApiLogger';
import { getProfileImageSource } from '../utils/profileImage';
import CustomRefreshControl from '../components/CustomRefreshControl';

const REQUEST_CATEGORIES = [
  { id: 'received', label: 'Received', icon: 'account-clock' },
  { id: 'sent', label: 'Sent', icon: 'account-arrow-right' },
];

const ConnectionRequestsScreen = () => {
  const navigation = useNavigation();
  const { showLoader, hideLoader } = useLoader();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('received');
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profileImageErrors, setProfileImageErrors] = useState({});

  useScreenApiLogger('ConnectionRequests');

  // Load data when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // Debug function to manually check all endpoints
  const debugBackendEndpoints = async () => {
    console.log('=== DEBUGGING BACKEND ENDPOINTS ===');
    
    try {
      const [receivedResult, sentResult, friendsResult] = await Promise.all([
        ConnectionApi.getReceivedRequests(1, 100),
        ConnectionApi.getSentRequests(1, 100),
        ConnectionApi.getConnections(1, 100),
      ]);
      
      console.log('🔍 RECEIVED CONNECTIONS:', JSON.stringify(receivedResult, null, 2));
      console.log('🔍 SENT CONNECTIONS:', JSON.stringify(sentResult, null, 2));
      console.log('🔍 FRIENDS/CONNECTIONS:', JSON.stringify(friendsResult, null, 2));
      
      console.log('=== END DEBUG ===');
    } catch (error) {
      console.error('Debug error:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Debug: Call the debug function to see all endpoints
      await debugBackendEndpoints();
      
      const [receivedResult, sentResult] = await Promise.all([
        ConnectionApi.getReceivedRequests(1, 100),
        ConnectionApi.getSentRequests(1, 100),
      ]);

      console.log('ConnectionRequests: Received result:', JSON.stringify(receivedResult, null, 2));
      
      if (receivedResult.success) {
        const connections = receivedResult.data.connections || [];
        console.log('ConnectionRequests: Raw received connections:', JSON.stringify(connections, null, 2));
        
        // Log all connection statuses to debug the issue
        connections.forEach((conn, index) => {
          console.log(`ConnectionRequests: Connection ${index} status:`, conn.status, 'ID:', conn.id, 'User:', conn.user?.name);
        });
        
        // Filter only PENDING requests (exclude ACCEPTED, REJECTED, etc.)
        const pendingReceived = connections.filter(req => {
          const isPending = req.status === 'PENDING';
          if (!isPending) {
            console.log(`ConnectionRequests: Filtering out non-pending connection - Status: ${req.status}, User: ${req.user?.name}`);
          }
          return isPending;
        });
        console.log('ConnectionRequests: Filtered pending received:', JSON.stringify(pendingReceived, null, 2));
        
        const transformedReceived = pendingReceived.map(req => ({
          id: req.user.id,
          name: req.user.name || 'Unknown',
          designation: req.user.profession || 'No designation',
          profilePic: req.user.profilePic,
          connectionId: req.id,
          status: req.status,
          createdAt: req.createdAt,
        }));
        
        console.log('ConnectionRequests: Transformed received requests:', transformedReceived);
        setReceivedRequests(transformedReceived);
      } else {
        console.warn('Failed to load received requests:', receivedResult.error);
        setReceivedRequests([]);
      }

      console.log('ConnectionRequests: Sent result:', JSON.stringify(sentResult, null, 2));
      
      if (sentResult.success) {
        const connections = sentResult.data.connections || [];
        console.log('ConnectionRequests: Raw sent connections:', JSON.stringify(connections, null, 2));
        
        // Log all connection statuses to debug the issue
        connections.forEach((conn, index) => {
          console.log(`ConnectionRequests: Sent Connection ${index} status:`, conn.status, 'ID:', conn.id, 'User:', conn.user?.name);
        });
        
        // Filter only PENDING requests (exclude ACCEPTED, REJECTED, etc.)
        const pendingSent = connections.filter(req => {
          const isPending = req.status === 'PENDING';
          if (!isPending) {
            console.log(`ConnectionRequests: Filtering out non-pending sent connection - Status: ${req.status}, User: ${req.user?.name}`);
          }
          return isPending;
        });
        console.log('ConnectionRequests: Filtered pending sent:', JSON.stringify(pendingSent, null, 2));
        
        const transformedSent = pendingSent.map(req => ({
          id: req.user.id,
          name: req.user.name || 'Unknown',
          designation: req.user.profession || 'No designation',
          profilePic: req.user.profilePic,
          connectionId: req.id,
          status: req.status,
          createdAt: req.createdAt,
        }));
        
        console.log('ConnectionRequests: Transformed sent requests:', transformedSent);
        setSentRequests(transformedSent);
      } else {
        console.warn('Failed to load sent requests:', sentResult.error);
        setSentRequests([]);
      }
    } catch (error) {
      console.error('Error loading request data:', error);
      Alert.alert('Error', 'Failed to load connection requests');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAcceptRequest = async (connectionId, userName) => {
    try {
      console.log('ConnectionRequests: Accepting request with connectionId:', connectionId, 'userName:', userName);
      showLoader();
      
      // Log the before state
      console.log('ConnectionRequests: BEFORE accept - received requests count:', receivedRequests.length);
      
      const result = await ConnectionApi.acceptConnectionRequest(connectionId);
      console.log('ConnectionRequests: Accept result:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        Alert.alert('Success', `Connection request from ${userName} accepted!`);
        console.log('ConnectionRequests: Reloading data after accept...');
        
        // Wait a moment before reloading to ensure backend has processed
        setTimeout(async () => {
          await loadData();
          console.log('ConnectionRequests: AFTER accept reload - received requests count:', receivedRequests.length);
        }, 1000);
      } else {
        Alert.alert('Error', result.error || 'Failed to accept connection request');
      }
    } catch (error) {
      console.error('ConnectionRequests: Accept error:', error);
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

  const handleCancelRequest = async (connectionId, userName) => {
    Alert.alert(
      'Cancel Request',
      `Are you sure you want to cancel your connection request to ${userName}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              showLoader();
              // For now, we'll use reject since there's no specific cancel endpoint
              const result = await ConnectionApi.rejectConnectionRequest(connectionId);
              if (result.success) {
                Alert.alert('Success', 'Connection request cancelled');
                await loadData();
              } else {
                Alert.alert('Error', result.error || 'Failed to cancel request');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel request');
            } finally {
              hideLoader();
            }
          },
        },
      ]
    );
  };

  const filteredReceived = useMemo(
    () =>
      receivedRequests.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.designation.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [receivedRequests, searchQuery]
  );

  const filteredSent = useMemo(
    () =>
      sentRequests.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.designation.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [sentRequests, searchQuery]
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  const renderReceivedRequest = useCallback(({ item }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
      >
        <Image
          source={
            profileImageErrors[item.id]
              ? require('../assets/icon.png')
              : getProfileImageSource(item, { 
                  fallbackKey: item.profilePic 
                })
          }
          style={styles.avatar}
          resizeMode="cover"
          defaultSource={require('../assets/icon.png')}
          onError={() =>
            setProfileImageErrors((prev) => ({ ...prev, [item.id]: true }))
          }
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.designation}>{item.designation}</Text>
          <Text style={styles.timeText}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={() => handleAcceptRequest(item.connectionId, item.name)}
          >
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => handleRejectRequest(item.connectionId, item.name)}
          >
            <Text style={styles.rejectText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, []);

  const renderSentRequest = useCallback(({ item }) => {
    const getStatusColor = (status) => {
      switch (status) {
        case 'ACCEPTED':
          return colors.success;
        case 'REJECTED':
          return colors.error;
        case 'PENDING':
        default:
          return colors.textSecondary;
      }
    };

    const getStatusText = (status) => {
      switch (status) {
        case 'ACCEPTED':
          return 'Accepted';
        case 'REJECTED':
          return 'Rejected';
        case 'PENDING':
        default:
          return 'Pending';
      }
    };

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
      >
        <Image
          source={
            profileImageErrors[item.id]
              ? require('../assets/icon.png')
              : getProfileImageSource(item, { 
                  fallbackKey: item.profilePic 
                })
          }
          style={styles.avatar}
          resizeMode="cover"
          defaultSource={require('../assets/icon.png')}
          onError={() =>
            setProfileImageErrors((prev) => ({ ...prev, [item.id]: true }))
          }
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.designation}>{item.designation}</Text>
          <Text style={styles.timeText}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
          {item.status === 'PENDING' && (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => handleCancelRequest(item.connectionId, item.name)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
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
      {REQUEST_CATEGORIES.map((cat) => (
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
          {cat.id === 'received' && filteredReceived.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{filteredReceived.length}</Text>
            </View>
          )}
          {cat.id === 'sent' && filteredSent.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{filteredSent.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderContent = () => {
    const data = activeCategory === 'received' ? filteredReceived : filteredSent;
    const renderItem = activeCategory === 'received' ? renderReceivedRequest : renderSentRequest;
    const emptyIcon = activeCategory === 'received' ? 'account-clock' : 'account-arrow-right';
    const emptyText = activeCategory === 'received' ? 'No received requests' : 'No sent requests';
    const emptySubText = activeCategory === 'received' 
      ? 'Connection requests from others will appear here'
      : 'Your sent connection requests will appear here';

    return (
      <FlatList
        data={data}
        keyExtractor={(item) => `${item.id}-${item.connectionId}`}
        renderItem={renderItem}
        refreshControl={
          <CustomRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name={emptyIcon} size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>{emptyText}</Text>
            <Text style={styles.emptySubText}>{emptySubText}</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header 
        title="CONNECTION REQUESTS" 
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />
      
      <Container style={styles.container}>
        {/* Search Bar */}
        <TextInput
          style={styles.searchBar}
          placeholder="Search requests..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {/* Category Tabs */}
        {renderCategoryTabs()}

        {/* Content */}
        {renderContent()}
      </Container>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 0,
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: colors.borderLight,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  designation: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  timeText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  acceptBtn: {
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
  },
  acceptText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 12,
  },
  rejectBtn: {
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rejectText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
  cancelBtn: {
    backgroundColor: colors.error,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cancelText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 10,
    minHeight: 42,
    marginBottom: 8,
  },
  catChipActive: {
    backgroundColor: colors.white,
  },
  catText: {
    marginLeft: 8,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  catTextActive: {
    color: colors.black,
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '600',
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
});

export default ConnectionRequestsScreen;
