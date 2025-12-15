import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import colors from '../config/colors';
import authManager from '../services/AuthManager';
import ConnectionApi from '../api/ConnectionApi';
import postApi from '../api/PostApi';
import profileApi from '../api/ProfileApi';
import authApi from '../api/AuthApi';
import useScreenApiLogger from '../hooks/useScreenApiLogger';

const SuggestedConnectionsScreen = ({ navigation }) => {
  const [connections, setConnections] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useScreenApiLogger('SuggestedConnection');

  useEffect(() => {
    const loadSuggestedConnections = async () => {
      try {
        setLoading(true);
        
        // Get current user ID
        const currentUserId = authApi.getCurrentUserId();
        if (!currentUserId) {
          console.error('SuggestedConnections: No current user ID found');
          setConnections([]);
          return;
        }

        // Get all users we're already connected to or have pending requests with
        const [connectionsResult, sentRequestsResult, receivedRequestsResult] = await Promise.all([
          ConnectionApi.getConnections(1, 100), // Get all connections
          ConnectionApi.getSentRequests(1, 100), // Get all sent requests
          ConnectionApi.getReceivedRequests(1, 100), // Get all received requests
        ]);

        // Collect all user IDs we should exclude
        const excludedUserIds = new Set([currentUserId]);
        
        // Add connected users (handle different response structures)
        if (connectionsResult.success) {
          const connections = connectionsResult.data?.users || connectionsResult.data?.connections || [];
          connections.forEach(item => {
            // Handle both direct user objects and connection objects with user property
            const userId = item.id || item.user?.id || item.userId;
            if (userId) {
              excludedUserIds.add(userId);
            }
          });
        }

        // Add sent request users (handle different response structures)
        if (sentRequestsResult.success) {
          const requests = sentRequestsResult.data?.requests || sentRequestsResult.data?.connections || [];
          requests.forEach(request => {
            // Handle both direct receiverId and nested user structure
            const userId = request.receiverId || request.user?.id || request.receiver?.id;
            if (userId) {
              excludedUserIds.add(userId);
            }
          });
        }

        // Add received request users (handle different response structures)
        if (receivedRequestsResult.success) {
          const requests = receivedRequestsResult.data?.requests || receivedRequestsResult.data?.connections || [];
          requests.forEach(request => {
            // Handle both direct senderId and nested user structure
            const userId = request.senderId || request.user?.id || request.sender?.id;
            if (userId) {
              excludedUserIds.add(userId);
            }
          });
        }

        console.log('SuggestedConnections: Excluding users:', Array.from(excludedUserIds));

        // Search for users with a broad query to get real users
        // Using common search terms that will return many users (min 2 chars required)
        // Try multiple searches to get a good pool of users
        const searchQueries = ['aa', 'ab', 'ac', 'ad', 'tech', 'sci', 'dev', 'eng']; // Common terms
        let allUsers = [];
        
        // Try to get users from multiple search queries
        for (const query of searchQueries) {
          if (allUsers.length >= 30) break; // Enough users collected
          
          try {
            const searchResult = await postApi.search(query, 'users', 1, 20);
            if (searchResult.success && searchResult.data?.users) {
              // Add users that aren't already in the collection
              const newUsers = searchResult.data.users.filter(user => {
                const userId = user.id || user.userId;
                return userId && !allUsers.find(u => (u.id || u.userId) === userId);
              });
              allUsers = [...allUsers, ...newUsers];
            }
          } catch (error) {
            console.log(`SuggestedConnections: Search with "${query}" failed:`, error.message);
          }
        }

        if (allUsers.length === 0) {
          console.log('SuggestedConnections: No users found from search');
          setConnections([]);
          return;
        }

        // Filter out already connected users
        const availableUsers = allUsers.filter(user => {
          // Handle different user ID formats (id, userId, etc.)
          const userId = user.id || user.userId;
          return userId && !excludedUserIds.has(userId);
        });

        if (availableUsers.length === 0) {
          console.log('SuggestedConnections: No available users after filtering');
          setConnections([]);
          return;
        }

        // Shuffle and pick 3 random users
        const shuffled = availableUsers.sort(() => 0.5 - Math.random());
        const selectedUsers = shuffled.slice(0, 3);

        // Format users for display
        const formattedConnections = await Promise.all(
          selectedUsers.map(async (user) => {
            const userId = user.id || user.userId;
            
            // Try to get full profile details
            let profileData = user;
            try {
              if (userId) {
                const profileResult = await profileApi.getProfile(userId);
                if (profileResult.success && profileResult.data) {
                  profileData = profileResult.data;
                }
              }
            } catch (error) {
              console.log(`SuggestedConnections: Failed to fetch profile for ${userId}:`, error.message);
            }

            // Extract user info from different possible structures
            const name = profileData.profile?.name || profileData.name || user.name || 'Unknown User';
            const bio = profileData.profile?.bio || profileData.bio || profileData.profession || user.profession || 'Member';
            const profilePic = profileData.profile?.profilePic || profileData.profilePic || user.profilePic || null;

            return {
              id: userId,
              name,
              bio,
              profilePic,
            };
          })
        );

        console.log('SuggestedConnections: Loaded', formattedConnections.length, 'suggestions');
        setConnections(formattedConnections);
      } catch (error) {
        console.error('SuggestedConnections: Failed to load suggestions', error);
        setConnections([]);
      } finally {
        setLoading(false);
      }
    };

    loadSuggestedConnections();
  }, []);

  const toggleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    newSelected.has(id) ? newSelected.delete(id) : newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const sendRequests = async () => {
    if (selectedIds.size === 0) {
      return;
    }

    try {
      setLoading(true);
      const ids = Array.from(selectedIds);

      for (const id of ids) {
        try {
          const result = await ConnectionApi.sendConnectionRequest(id);
          if (!result.success) {
            console.warn('SuggestedConnections: Failed to send request for user', id, result.error);
          }
        } catch (requestError) {
          console.error('SuggestedConnections: Error sending request for user', id, requestError);
        }
      }

      alert('Connection requests sent!');
      setSelectedIds(new Set());

      // Complete onboarding
      await authManager.completeOnboarding();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      alert('Failed to send some connection requests. You can try again later.');

      // Complete onboarding even if connection requests fail
      await authManager.completeOnboarding();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <LinearGradient
        colors={[colors.background, colors.backgroundSecondary, colors.background]}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color="#8a2be2" />
        <Text style={styles.loadingText}>Finding your community...</Text>
      </LinearGradient>
    );
  }

  const renderConnectionItem = ({ item }) => {
    const isSelected = selectedIds.has(item.id);
    
    return (
      <TouchableOpacity
        style={[styles.connectionCard, isSelected && styles.selectedCard]}
        onPress={() => toggleSelect(item.id)}
      >
        <View style={styles.cardContent}>
          <Image
            source={
              item.profilePic
                ? profileApi.getImageSource(item.profilePic, authApi.getAccessToken())
                : require('../assets/icon.png')
            }
            style={styles.avatar}
          />
          <View style={styles.userInfo}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.bio}>{item.bio}</Text>
          </View>
          <TouchableOpacity
            style={[styles.connectButton, isSelected && styles.connectedButton]}
            onPress={() => toggleSelect(item.id)}
          >
            <Icon
              name={isSelected ? 'check' : 'plus'}
              size={16}
              color={isSelected ? '#8a2be2' : 'white'}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient
      colors={[colors.background, colors.backgroundSecondary, colors.background]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logoText}>Xcience</Text>
          <Text style={styles.title}>Connect with People</Text>
          <Text style={styles.subtitle}>
            Discover and connect with like-minded{'\n'}
            individuals in your community
          </Text>
        </View>

        {/* Connections List */}
        <FlatList
          data={connections}
          keyExtractor={(item) => item.id}
          renderItem={renderConnectionItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No suggestions available right now.</Text>
            </View>
          }
        />

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <Text style={styles.selectedText}>
            {selectedIds.size} {selectedIds.size === 1 ? 'person' : 'people'} selected
          </Text>
          
          <TouchableOpacity
            style={[
              styles.sendRequestsButton,
              selectedIds.size === 0 && styles.disabledButton,
            ]}
            onPress={sendRequests}
            disabled={selectedIds.size === 0}
          >
            <LinearGradient
              colors={selectedIds.size > 0 ? ['#8a2be2', '#9932cc'] : ['rgba(138, 43, 226, 0.3)', 'rgba(153, 50, 204, 0.3)']}
              style={styles.gradientButton}
            >
              <Text style={styles.sendButtonText}>
                Send {selectedIds.size > 0 ? `${selectedIds.size} ` : ''}Request{selectedIds.size !== 1 ? 's' : ''}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={async () => {
              // Complete onboarding
              await authManager.completeOnboarding();
              
              // AuthManager will automatically handle navigation through AuthNavigator
              // to the main app
            }}
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 30,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 22,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    textAlign: 'center',
  },
  connectionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  selectedCard: {
    backgroundColor: 'rgba(138, 43, 226, 0.1)',
    borderColor: '#8a2be2',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    backgroundColor: colors.backgroundElevated,
  },
  userInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  bio: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },
  connectButton: {
    backgroundColor: '#8a2be2',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectedButton: {
    backgroundColor: 'rgba(138, 43, 226, 0.2)',
    borderWidth: 1,
    borderColor: '#8a2be2',
  },
  actionSection: {
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  selectedText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 20,
  },
  sendRequestsButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  gradientButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
  },
  sendButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});

export default SuggestedConnectionsScreen;
