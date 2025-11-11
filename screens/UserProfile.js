// screens/UserProfile.js
import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, Modal, Animated, Alert } from 'react-native';
import Container from '../components/Container';
import colors from '../config/colors';
import ConnectionApi from '../api/ConnectionApi';
import ProfileApi from '../api/ProfileApi';
import chatApi from '../api/ChatApi';
import PostCard from '../components/PostCard';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../components/Header';
import { useLoader } from "../context/LoaderContext";
import { useNotification } from '../contexts/NotificationContext';
import postApi from '../api/PostApi';
import useScreenApiLogger from '../hooks/useScreenApiLogger';

const UserProfileScreen = ({ navigation, route }) => {
  const { userId } = route.params;
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('unknown');
  const [connectionData, setConnectionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('About');
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [modalAnimation] = useState(new Animated.Value(0));
  const { showLoader, hideLoader } = useLoader();
  const { showError, showSuccess, showWarning, showInfo } = useNotification();

  useScreenApiLogger('UserProfile');

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
      
      // Load user profile data
      const profileResult = await ProfileApi.getProfile(userId);
      if (!profileResult.success) {
        throw new Error(profileResult.error);
      }
      
      // Load connection status
      const statusResult = await ConnectionApi.getConnectionStatus(userId);
      let status = 'not_connected';
      let connectionInfo = null;
      
      if (statusResult.success && statusResult.data) {
        connectionInfo = statusResult.data;
        
        // Map API status to our internal status
        switch (statusResult.data.status) {
          case 'ACCEPTED':
            status = 'connected';
            break;
          case 'PENDING':
            // Determine if it's incoming or outgoing based on who sent the request
            // Assuming the API returns senderId and receiverId or similar
            status = statusResult.data.isIncoming ? 'pending_incoming' : 'pending_outgoing';
            break;
          case 'NONE':
          default:
            status = 'not_connected';
            break;
        }
      }
      
      setConnectionData(connectionInfo);
      
      // Fetch actual connections count for this user
      // Note: For now using limit=1 just to get the total count from pagination
      try {
        const connectionsResult = await ConnectionApi.getUserConnections(userId, 1, 1);
        if (connectionsResult.success && connectionsResult.data) {
          const totalConnections = connectionsResult.data.pagination?.total || 0;
          profileResult.data.connectionsCount = totalConnections;
        }
      } catch (error) {
        console.log('Could not fetch connections count:', error);
        // Set default to 0 if can't fetch
        profileResult.data.connectionsCount = 0;
      }
      
      // Transform profile data to match UI expectations
      const transformedUser = {
        ...profileResult.data,
        // Map profession to designation if needed
        designation: profileResult.data.designation || profileResult.data.profession || 'No designation',
        // Transform experiences to workExperience format
        workExperience: profileResult.data.experiences?.map(exp => ({
          id: exp.id,
          company: exp.company,
          position: exp.role || exp.position,
          duration: exp.startDate 
            ? `${new Date(exp.startDate).getFullYear()} - ${exp.endDate ? new Date(exp.endDate).getFullYear() : 'Present'}`
            : (exp.duration || 'Duration not specified'),
          description: exp.description,
          isCurrentRole: exp.isCurrentRole || exp.isCurrent
        })) || [],
        // Transform education format
        education: profileResult.data.education?.map(edu => ({
          id: edu.id,
          institution: edu.institution,
          degree: edu.degree,
          fieldOfStudy: edu.fieldOfStudy,
          duration: edu.startDate
            ? `${new Date(edu.startDate).getFullYear()} - ${edu.endDate ? new Date(edu.endDate).getFullYear() : 'Present'}`
            : (edu.duration || 'Duration not specified'),
          grade: edu.grade,
          isCurrent: edu.isCurrent
        })) || [],
      };
      
      setUser(transformedUser);
      
      // Load user posts
      try {
        const postsResult = await postApi.getUserPosts(userId, 1, 10);
        console.log('UserProfile: Posts result:', postsResult);
        
        if (postsResult.success && postsResult.data) {
          // Handle different response structures
          const postsArray = Array.isArray(postsResult.data) 
            ? postsResult.data 
            : (postsResult.data.posts || postsResult.data.data || []);
          
          console.log('UserProfile: Posts array:', postsArray);
          setPosts(Array.isArray(postsArray) ? postsArray : []);
        } else {
          console.warn('UserProfile: Failed to load user posts:', postsResult.message || postsResult.error);
          setPosts([]);
        }
      } catch (postError) {
        console.error('UserProfile: Error loading user posts:', postError);
        setPosts([]);
      }
      setConnectionStatus(status);
    } catch (error) {
      console.error('Error loading user data:', error);
      showError('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      showLoader();
      const result = await ConnectionApi.sendConnectionRequest(userId);
      if (result.success) {
        // Refresh connection status to get updated information
        await refreshConnectionStatus();
        showSuccess('Connection request sent!');
      } else {
        showError(result.error || 'Failed to send connection request');
      }
    } catch (error) {
      console.error('Send connection error:', error);
      showError('Failed to send connection request');
    } finally {
      hideLoader();
    }
  };

  const handleAcceptRequest = async () => {
    try {
      if (!connectionData?.connectionId) {
        showError('Connection ID not found');
        return;
      }

      showLoader();
      const result = await ConnectionApi.acceptConnectionRequest(connectionData.connectionId);
      if (result.success) {
        // Reload connection status to get updated information
        await refreshConnectionStatus();
        showSuccess('Connection request accepted!');
      } else {
        showError(result.error || 'Failed to accept connection request');
      }
    } catch (error) {
      console.error('Accept request error:', error);
      showError('Failed to accept connection request');
    } finally {
      hideLoader();
    }
  };

  const handleRejectRequest = async () => {
    try {
      if (!connectionData?.connectionId) {
        showError('Connection ID not found');
        return;
      }

      showLoader();
      const result = await ConnectionApi.rejectConnectionRequest(connectionData.connectionId);
      if (result.success) {
        // Reload connection status to get updated information
        await refreshConnectionStatus();
        showSuccess('Connection request rejected');
      } else {
        showError(result.error || 'Failed to reject connection request');
      }
    } catch (error) {
      console.error('Reject request error:', error);
      showError('Failed to reject connection request');
    } finally {
      hideLoader();
    }
  };

  // Refresh connection status
  const refreshConnectionStatus = async () => {
    try {
      const statusResult = await ConnectionApi.getConnectionStatus(userId);
      let status = 'not_connected';
      let connectionInfo = null;
      
      if (statusResult.success && statusResult.data) {
        connectionInfo = statusResult.data;
        
        switch (statusResult.data.status) {
          case 'ACCEPTED':
            status = 'connected';
            break;
          case 'PENDING':
            status = statusResult.data.isIncoming ? 'pending_incoming' : 'pending_outgoing';
            break;
          case 'NONE':
          default:
            status = 'not_connected';
            break;
        }
      }
      
      setConnectionData(connectionInfo);
      setConnectionStatus(status);
    } catch (error) {
      console.error('Error refreshing connection status:', error);
    }
  };

  const handleMessage = async () => {
    if (connectionStatus === 'connected') {
      try {
        showLoader();
        console.log('Starting chat with user:', user?.name);

        // Create or get direct chat room with this user
        const chatResult = await chatApi.createOrGetDirectChat(userId);

        if (chatResult.success) {
          console.log('Chat room created/found:', chatResult.data);

          // Navigate to OneToOneChat screen with user details
          navigation.navigate('OneToOneChat', {
            userId: userId,
            userName: user?.name,
            avatar: user?.profilePic,
            isOnline: true, // Default to online since we don't have real-time status yet
            roomId: chatResult.data.id,
          });
        } else {
          console.error('Failed to create/get chat room:', chatResult.message);
          showError('Failed to start chat. Please try again.');
        }
      } catch (error) {
        console.error('Error starting chat:', error);
        showError('Failed to start chat. Please try again.');
      } finally {
        hideLoader();
      }
    } else if (connectionStatus === 'not_connected') {
      // Only show modal when user is not connected at all
      setShowConnectionModal(true);
      Animated.spring(modalAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else if (connectionStatus === 'pending_outgoing') {
      // Show notification for pending request
      showWarning('You will be able to chat once the other person accepts your request', 4000);
    } else if (connectionStatus === 'pending_incoming') {
      // Show notification to accept the request first
      showInfo('Accept the connection request first to start messaging', 3500);
    }
  };

  const handleRemoveConnection = async () => {
    Alert.alert(
      'Remove Connection',
      `Are you sure you want to remove ${user?.name} from your connections?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              showLoader();
              const result = await ConnectionApi.removeConnection(userId);
              if (result.success) {
                // Refresh connection status to get updated information
                await refreshConnectionStatus();
                showSuccess('Connection removed successfully');
              } else {
                showError(result.error || 'Failed to remove connection');
              }
            } catch (error) {
              console.error('Remove connection error:', error);
              showError('Failed to remove connection');
            } finally {
              hideLoader();
            }
          },
        },
      ]
    );
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

  const formatDateRange = (startDate, endDate, isCurrent) => {
    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    };

    const start = formatDate(startDate);
    const end = isCurrent ? 'Present' : formatDate(endDate);

    return `${start} - ${end}`;
  };

  const renderAboutSection = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.aboutSection}>
        <Text style={styles.aboutText}>{user.bio}</Text>
        
        {/* Connections Count */}
        <View style={styles.connectionsContainer}>
          <Text style={styles.connectionsCount}>
            {user.connectionsCount || 0} Connection{user.connectionsCount !== 1 ? 's' : ''}
          </Text>
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

        {/* Topics Section */}
        {user.topics && user.topics.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Icon name="tag-outline" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>Topics of Interest</Text>
            </View>
            <View style={styles.skillsContainer}>
              {user.topics.map((topic, index) => (
                <View key={index} style={styles.skillChip}>
                  <Text style={styles.skillText}>{topic}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Work Experience Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Icon name="briefcase-outline" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Work Experience</Text>
          </View>
          {user.experiences && user.experiences.length > 0 ? (
            user.experiences.map((work) => (
              <View key={work.id} style={styles.experienceItem}>
                <View style={styles.experienceHeader}>
                  <Icon name="domain" size={40} color={colors.primary} />
                  <View style={styles.experienceDetails}>
                    <Text style={styles.experienceCompany}>{work.company}</Text>
                    <Text style={styles.experiencePosition}>{work.role}</Text>
                    <Text style={styles.experienceDuration}>
                      {formatDateRange(work.startDate, work.endDate, work.isCurrentRole)}
                    </Text>
                    {work.description && (
                      <Text style={styles.experienceDescription}>{work.description}</Text>
                    )}
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No work experience listed</Text>
          )}
        </View>

        {/* Education Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Icon name="school-outline" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Education</Text>
          </View>
          {user.education && user.education.length > 0 ? (
            user.education.map((edu) => (
              <View key={edu.id} style={styles.experienceItem}>
                <View style={styles.experienceHeader}>
                  <Icon name="school" size={40} color={colors.primary} />
                  <View style={styles.experienceDetails}>
                    <Text style={styles.experienceCompany}>{edu.institution}</Text>
                    <Text style={styles.experiencePosition}>
                      {edu.degree}
                      {edu.fieldOfStudy && ` in ${edu.fieldOfStudy}`}
                    </Text>
                    <Text style={styles.experienceDuration}>
                      {formatDateRange(edu.startDate, edu.endDate, edu.isCurrent)}
                    </Text>
                    {edu.grade && (
                      <Text style={styles.experienceDescription}>Grade: {edu.grade}</Text>
                    )}
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No education listed</Text>
          )}
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
            <TouchableOpacity style={[styles.actionButton, styles.removeButton]} onPress={handleRemoveConnection}>
              <Icon name="account-minus" size={20} color={colors.white} />
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
          <ScrollView style={styles.tabContent}>
            <View style={styles.aboutSection}>
              <Text style={styles.aboutText}>{user.bio || 'No bio available'}</Text>
              
              {/* Connections Count */}
              <View style={styles.connectionsContainer}>
                <Text style={styles.connectionsCount}>
                  {user.connectionsCount || 0} Connection{user.connectionsCount !== 1 ? 's' : ''}
                </Text>
              </View>

              {/* Skills Section */}
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <Icon name="lightbulb-outline" size={24} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Skills</Text>
                </View>
                <View style={styles.skillsContainer}>
                  {user.skills && user.skills.length > 0 ? (
                    user.skills.map((skill, index) => (
                      <View key={index} style={styles.skillChip}>
                        <Text style={styles.skillText}>{skill}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noDataText}>No skills listed</Text>
                  )}
                </View>
              </View>

              {/* Work Experience Section */}
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <Icon name="briefcase-outline" size={24} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Work Experience</Text>
                </View>
                {user.workExperience && user.workExperience.length > 0 ? (
                  user.workExperience.map((work) => (
                    <View key={work.id} style={styles.experienceItem}>
                      <View style={styles.experienceHeader}>
                        <Icon name="domain" size={40} color={colors.primary} />
                        <View style={styles.experienceDetails}>
                          <Text style={styles.experienceCompany}>{work.company}</Text>
                          <Text style={styles.experiencePosition}>{work.position}</Text>
                          <Text style={styles.experienceDuration}>{work.duration}</Text>
                          {work.description && (
                            <Text style={styles.experienceDescription}>{work.description}</Text>
                          )}
                        </View>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noDataText}>No work experience listed</Text>
                )}
              </View>

              {/* Education Section */}
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <Icon name="school-outline" size={24} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Education</Text>
                </View>
                {user.education && user.education.length > 0 ? (
                  user.education.map((edu) => (
                    <View key={edu.id} style={styles.experienceItem}>
                      <View style={styles.experienceHeader}>
                        <Icon name="school" size={40} color={colors.primary} />
                        <View style={styles.experienceDetails}>
                          <Text style={styles.experienceCompany}>{edu.institution}</Text>
                          <Text style={styles.experiencePosition}>
                            {edu.degree}
                            {edu.fieldOfStudy && ` in ${edu.fieldOfStudy}`}
                          </Text>
                          <Text style={styles.experienceDuration}>{edu.duration}</Text>
                          {edu.grade && (
                            <Text style={styles.experienceDescription}>Grade: {edu.grade}</Text>
                          )}
                        </View>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noDataText}>No education listed</Text>
                )}
              </View>
            </View>
          </ScrollView>
        ) : (
          <ScrollView style={styles.tabContent}>
            <View style={styles.postsContainer}>
              {posts.length > 0 ? (
                posts.map(post => (
                  <PostCard key={post.id} post={post} style={styles.postCard} />
                ))
              ) : (
                <View style={styles.noPosts}>
                  <Icon name="file-document-outline" size={64} color={colors.textMuted} />
                  <Text style={styles.noPostsText}>No posts yet</Text>
                  <Text style={styles.noPostsSubtext}>This user hasn't shared any posts</Text>
                </View>
              )}
            </View>
          </ScrollView>
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
              <Text style={styles.modalTitle}>Connect to Message</Text>
            </View>
            
            <Text style={styles.modalMessage}>
              Connect with {user?.name} to start messaging and unlock more networking opportunities.
            </Text>
            
            <View style={styles.connectionBenefits}>
              <View style={styles.benefitItem}>
                <Icon name="message-text" size={20} color={colors.primary} />
                <Text style={styles.benefitText}>Send direct messages</Text>
              </View>
              <View style={styles.benefitItem}>
                <Icon name="account-group" size={20} color={colors.primary} />
                <Text style={styles.benefitText}>View full profile details</Text>
              </View>
              <View style={styles.benefitItem}>
                <Icon name="share-variant" size={20} color={colors.primary} />
                <Text style={styles.benefitText}>Share content and insights</Text>
              </View>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.connectModalButton]} 
                onPress={() => {
                  closeConnectionModal();
                  handleConnect();
                }}
              >
                <Icon name="account-plus" size={20} color={colors.white} style={{ marginRight: 8 }} />
                <Text style={styles.modalButtonText}>Send Connection Request</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelModalButton]} 
                onPress={closeConnectionModal}
              >
                <Text style={[styles.modalButtonText, styles.cancelButtonText]}>Maybe Later</Text>
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
    marginBottom: 4,
  },
  experienceDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
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
  tabContent: {
    flex: 1,
  },
  noPosts: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  noPostsText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  noPostsSubtext: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  smallButton: {
    minWidth: 50,
    paddingHorizontal: 12,
  },
  removeButton: {
    backgroundColor: '#dc3545',
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
  connectionBenefits: {
    width: '100%',
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 12,
    flex: 1,
  },
});

export default UserProfileScreen;
