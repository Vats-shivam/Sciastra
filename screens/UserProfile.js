// screens/UserProfile.js
import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Container from '../components/Container';
import colors from '../config/colors';
import { api } from '../api/MockApi';
import PostCard from '../components/PostCard';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../components/Header';
import { useLoader } from "../context/LoaderContext";

const UserProfileScreen = ({ navigation, route }) => {
  const { userId } = route.params;
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('unknown');
  const [loading, setLoading] = useState(true);
  const { showLoader, hideLoader } = useLoader();

  useEffect(() => {
    // If this is the current user, redirect to Profile screen
    if (userId === '1') {
      navigation.replace('Profile');
      return;
    }
    loadUserData();
  }, [userId]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const [userData, userPosts, status] = await Promise.all([
        api.getUserById(userId),
        api.getUserPosts(userId),
        api.checkConnectionStatus(userId)
      ]);
      
      setUser(userData);
      setPosts(userPosts);
      setConnectionStatus(status.status);
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Error', 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      showLoader();
      await api.sendConnectionRequest(userId);
      setConnectionStatus('pending_outgoing');
      Alert.alert('Success', 'Connection request sent!');
    } catch (error) {
      Alert.alert('Error', 'Failed to send connection request');
    } finally {
      hideLoader();
    }
  };

  const handleAcceptRequest = async () => {
    try {
      showLoader();
      await api.acceptConnectionRequest(userId);
      setConnectionStatus('connected');
      Alert.alert('Success', 'Connection request accepted!');
    } catch (error) {
      Alert.alert('Error', 'Failed to accept connection request');
    } finally {
      hideLoader();
    }
  };

  const handleRejectRequest = async () => {
    try {
      showLoader();
      await api.rejectConnectionRequest(userId);
      setConnectionStatus('not_connected');
      Alert.alert('Success', 'Connection request rejected');
    } catch (error) {
      Alert.alert('Error', 'Failed to reject connection request');
    } finally {
      hideLoader();
    }
  };

  const handleMessage = () => {
    navigation.navigate('OneToOneChat', { 
      userId: userId, 
      userName: user?.name 
    });
  };

  const renderActionButton = () => {
    // Don't show any action button for current user
    if (userId === '1') {
      return null;
    }

    switch (connectionStatus) {
      case 'connected':
        return (
          <TouchableOpacity style={[styles.actionButton, styles.messageButton]} onPress={handleMessage}>
            <Icon name="message" size={20} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.actionButtonText}>Message</Text>
          </TouchableOpacity>
        );
      
      case 'pending_incoming':
        return (
          <View style={styles.actionButtonGroup}>
            <TouchableOpacity style={[styles.actionButton, styles.acceptButton]} onPress={handleAcceptRequest}>
              <Text style={styles.actionButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={handleRejectRequest}>
              <Text style={[styles.actionButtonText, styles.rejectButtonText]}>Reject</Text>
            </TouchableOpacity>
          </View>
        );
      
      case 'pending_outgoing':
        return (
          <TouchableOpacity style={[styles.actionButton, styles.pendingButton]} disabled>
            <Text style={[styles.actionButtonText, styles.pendingButtonText]}>Request Sent</Text>
          </TouchableOpacity>
        );
      
      case 'not_connected':
      default:
        return (
          <TouchableOpacity style={[styles.actionButton, styles.connectButton]} onPress={handleConnect}>
            <Icon name="account-plus" size={20} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.actionButtonText}>Connect</Text>
          </TouchableOpacity>
        );
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.textPrimary }}>Loading profile...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.textPrimary }}>User not found</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <Header title="PROFILE" />
      
      <ScrollView>
        {/* Profile Info */}
        <View style={styles.profileInfo}>
          <Image
            source={user.profilePic ? { uri: user.profilePic } : require('../assets/icon.png')}
            style={styles.avatar}
          />
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.designation}>{user.designation}</Text>
          <Text style={styles.bio}>{user.bio}</Text>
          <Text style={styles.location}>{user.location}</Text>
          
          {/* Action Button */}
          <View style={styles.actionContainer}>
            {renderActionButton()}
          </View>
        </View>

        {/* Posts Section */}
        <View style={styles.postsSection}>
          <Text style={styles.sectionTitle}>
            {connectionStatus === 'connected' ? `${user.name}'s Posts` : 'Public Posts'}
          </Text>
          {posts.length > 0 ? (
            posts.map(post => (
              <PostCard key={post.id} post={post} style={styles.postCard} />
            ))
          ) : (
            <View style={styles.noPosts}>
              <Text style={styles.noPostsText}>No posts yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  profileInfo: { 
    alignItems: 'center', 
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  avatar: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    marginBottom: 12 
  },
  name: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: colors.primary,
    marginBottom: 4,
  },
  designation: { 
    fontSize: 16, 
    color: colors.secondary,
    marginBottom: 8,
  },
  bio: { 
    fontSize: 14, 
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  location: { 
    fontSize: 14, 
    color: colors.textSecondary,
    marginBottom: 16,
  },
  actionContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 140,
  },
  actionButtonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  connectButton: {
    backgroundColor: colors.primary,
  },
  messageButton: {
    backgroundColor: colors.accent,
  },
  acceptButton: {
    backgroundColor: colors.success,
    minWidth: 80,
  },
  rejectButton: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 80,
  },
  pendingButton: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 16,
  },
  rejectButtonText: {
    color: colors.textPrimary,
  },
  pendingButtonText: {
    color: colors.textSecondary,
  },
  postsSection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    color: colors.primary,
  },
  postCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  noPosts: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noPostsText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
});

export default UserProfileScreen;
