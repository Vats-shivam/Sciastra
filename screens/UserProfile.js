// screens/UserProfile.js
import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, Alert, Modal, Animated } from 'react-native';
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
  const [activeTab, setActiveTab] = useState('About');
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [modalAnimation] = useState(new Animated.Value(0));
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
    if (connectionStatus === 'connected') {
      navigation.navigate('OneToOneChat', { 
        userId: userId, 
        userName: user?.name 
      });
    } else {
      // Show connection required modal
      setShowConnectionModal(true);
      Animated.spring(modalAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  };

  const closeConnectionModal = () => {
    Animated.timing(modalAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowConnectionModal(false);
    });
  };

  const renderAboutSection = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.aboutSection}>
        <Text style={styles.aboutText}>{user.bio}</Text>
        
        {/* Connections Count */}
        <View style={styles.connectionsContainer}>
          <Text style={styles.connectionsCount}>{user.connectionsCount || 0}+ Connections</Text>
        </View>

        {/* Skills Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Icon name="lightbulb-outline" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Skills</Text>
          </View>
          <View style={styles.skillsContainer}>
            {user.skills?.map((skill, index) => (
              <View key={index} style={styles.skillChip}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            )) || <Text style={styles.noDataText}>No skills listed</Text>}
          </View>
        </View>

        {/* Work Experience Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Icon name="briefcase-outline" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Work Experience</Text>
          </View>
          {user.workExperience?.map((work) => (
            <View key={work.id} style={styles.experienceItem}>
              <View style={styles.experienceHeader}>
                <Icon name="domain" size={40} color={colors.primary} />
                <View style={styles.experienceDetails}>
                  <Text style={styles.experienceCompany}>{work.company}</Text>
                  <Text style={styles.experiencePosition}>{work.position}</Text>
                  <Text style={styles.experienceDuration}>{work.duration}</Text>
                </View>
              </View>
            </View>
          )) || <Text style={styles.noDataText}>No work experience listed</Text>}
        </View>

        {/* Education Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Icon name="school-outline" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Education</Text>
          </View>
          {user.education?.map((edu) => (
            <View key={edu.id} style={styles.experienceItem}>
              <View style={styles.experienceHeader}>
                <Icon name="school" size={40} color={colors.primary} />
                <View style={styles.experienceDetails}>
                  <Text style={styles.experienceCompany}>{edu.institution}</Text>
                  <Text style={styles.experiencePosition}>{edu.degree}</Text>
                  <Text style={styles.experienceDuration}>{edu.duration}</Text>
                </View>
              </View>
            </View>
          )) || <Text style={styles.noDataText}>No education listed</Text>}
        </View>
      </View>
    </ScrollView>
  );

  const renderPostsSection = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.postsContainer}>
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
  );

  const renderActionButton = () => {
    // Don't show any action button for current user
    if (userId === '1') {
      return null;
    }

    switch (connectionStatus) {
      case 'connected':
        return (
          <View style={styles.actionButtonGroup}>
            <TouchableOpacity style={[styles.actionButton, styles.messageButton]} onPress={handleMessage}>
              <Icon name="message" size={20} color={colors.white} style={{ marginRight: 8 }} />
              <Text style={styles.actionButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
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
            <TouchableOpacity style={[styles.actionButton, styles.messageButton, styles.smallButton]} onPress={handleMessage}>
              <Icon name="message" size={16} color={colors.white} />
            </TouchableOpacity>
          </View>
        );
      
      case 'pending_outgoing':
        return (
          <View style={styles.actionButtonGroup}>
            <TouchableOpacity style={[styles.actionButton, styles.pendingButton]} disabled>
              <Text style={[styles.actionButtonText, styles.pendingButtonText]}>Request Sent</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.messageButton, styles.smallButton]} onPress={handleMessage}>
              <Icon name="message" size={16} color={colors.white} />
            </TouchableOpacity>
          </View>
        );
      
      case 'not_connected':
      default:
        return (
          <View style={styles.actionButtonGroup}>
            <TouchableOpacity style={[styles.actionButton, styles.connectButton]} onPress={handleConnect}>
              <Icon name="account-plus" size={20} color={colors.white} style={{ marginRight: 8 }} />
              <Text style={styles.actionButtonText}>Connect</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.messageButton, styles.smallButton]} onPress={handleMessage}>
              <Icon name="message" size={16} color={colors.white} />
            </TouchableOpacity>
          </View>
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
      
      <ScrollView style={{ flex: 1 }}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Image
            source={user.profilePic ? { uri: user.profilePic } : require('../assets/icon.png')}
            style={styles.avatar}
          />
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.designation}>{user.designation}</Text>
          
          {/* Action Button */}
          <View style={styles.actionContainer}>
            {renderActionButton()}
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'About' && styles.activeTab]}
            onPress={() => setActiveTab('About')}
          >
            <Text style={[styles.tabText, activeTab === 'About' && styles.activeTabText]}>About</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'Posts' && styles.activeTab]}
            onPress={() => setActiveTab('Posts')}
          >
            <Text style={[styles.tabText, activeTab === 'Posts' && styles.activeTabText]}>Posts</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'About' ? (
          <View style={styles.aboutSection}>
            <Text style={styles.aboutText}>{user.bio}</Text>
            
            {/* Connections Count */}
            <View style={styles.connectionsContainer}>
              <Text style={styles.connectionsCount}>{user.connectionsCount || 0}+ Connections</Text>
            </View>

            {/* Skills Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Icon name="lightbulb-outline" size={24} color={colors.primary} />
                <Text style={styles.sectionTitle}>Skills</Text>
              </View>
              <View style={styles.skillsContainer}>
                {user.skills?.map((skill, index) => (
                  <View key={index} style={styles.skillChip}>
                    <Text style={styles.skillText}>{skill}</Text>
                  </View>
                )) || <Text style={styles.noDataText}>No skills listed</Text>}
              </View>
            </View>

            {/* Work Experience Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Icon name="briefcase-outline" size={24} color={colors.primary} />
                <Text style={styles.sectionTitle}>Work Experience</Text>
              </View>
              {user.workExperience?.map((work) => (
                <View key={work.id} style={styles.experienceItem}>
                  <View style={styles.experienceHeader}>
                    <Icon name="domain" size={40} color={colors.primary} />
                    <View style={styles.experienceDetails}>
                      <Text style={styles.experienceCompany}>{work.company}</Text>
                      <Text style={styles.experiencePosition}>{work.position}</Text>
                      <Text style={styles.experienceDuration}>{work.duration}</Text>
                    </View>
                  </View>
                </View>
              )) || <Text style={styles.noDataText}>No work experience listed</Text>}
            </View>

            {/* Education Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Icon name="school-outline" size={24} color={colors.primary} />
                <Text style={styles.sectionTitle}>Education</Text>
              </View>
              {user.education?.map((edu) => (
                <View key={edu.id} style={styles.experienceItem}>
                  <View style={styles.experienceHeader}>
                    <Icon name="school" size={40} color={colors.primary} />
                    <View style={styles.experienceDetails}>
                      <Text style={styles.experienceCompany}>{edu.institution}</Text>
                      <Text style={styles.experiencePosition}>{edu.degree}</Text>
                      <Text style={styles.experienceDuration}>{edu.duration}</Text>
                    </View>
                  </View>
                </View>
              )) || <Text style={styles.noDataText}>No education listed</Text>}
            </View>
          </View>
        ) : (
          <View style={styles.postsContainer}>
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
        )}
      </ScrollView>

      {/* Connection Required Modal */}
      <Modal
        visible={showConnectionModal}
        transparent
        animationType="none"
        onRequestClose={closeConnectionModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [
                  {
                    scale: modalAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
                opacity: modalAnimation,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Icon name="account-heart" size={48} color={colors.button} />
              <Text style={styles.modalTitle}>Connection Required</Text>
            </View>
            
            <Text style={styles.modalMessage}>
              You need to be connected with {user?.name} to send them messages. 
              Send a connection request first!
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.connectModalButton]} 
                onPress={() => {
                  closeConnectionModal();
                  handleConnect();
                }}
              >
                <Icon name="account-plus" size={20} color={colors.white} style={{ marginRight: 8 }} />
                <Text style={styles.modalButtonText}>Send Request</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelModalButton]} 
                onPress={closeConnectionModal}
              >
                <Text style={[styles.modalButtonText, styles.cancelButtonText]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 20,
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
    textAlign: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectButton: {
    backgroundColor: colors.button,
  },
  messageButton: {
    backgroundColor: colors.button,
  },
  acceptButton: {
    backgroundColor: colors.button,
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    marginHorizontal: 15,
    borderRadius: 25,
    padding: 4,
    marginBottom: 15,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: colors.button,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.white,
  },
  aboutSection: {
    paddingHorizontal: 15,
  },
  aboutText: {
    fontSize: 16,
    color: colors.textPrimary,
    lineHeight: 24,
    marginBottom: 16,
  },
  connectionsContainer: {
    marginBottom: 20,
  },
  connectionsCount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  sectionContainer: {
    marginBottom: 24,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    flex: 1,
    marginLeft: 12,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skillText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  experienceItem: {
    marginBottom: 16,
  },
  experienceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  experienceDetails: {
    flex: 1,
    marginLeft: 12,
  },
  experienceCompany: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  experiencePosition: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  experienceDuration: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  noDataText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  postsContainer: {
    paddingHorizontal: 15,
  },
  postCard: {
    backgroundColor: colors.card,
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
  smallButton: {
    minWidth: 50,
    paddingHorizontal: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  connectModalButton: {
    backgroundColor: colors.button,
  },
  cancelModalButton: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  cancelButtonText: {
    color: colors.textPrimary,
  },
});

export default UserProfileScreen;
