// screens/ProfileScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, Alert, TextInput, ActivityIndicator } from 'react-native';
import Container from '../components/Container';
import colors from '../config/colors';
import authManager from '../services/AuthManager';
import postApi from '../api/PostApi';
import PostCard from '../components/PostCard';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Modal, Pressable } from 'react-native';
import Header from '../components/Header';
import { useLoader } from "../context/LoaderContext";
import ConnectionApi from '../api/ConnectionApi';
import useScreenApiLogger from '../hooks/useScreenApiLogger';
import CustomRefreshControl from '../components/CustomRefreshControl';
import profileApi from '../api/ProfileApi';
import { getProfileImageSource } from '../utils/profileImage';
import { useFocusEffect } from '@react-navigation/native';
import { ProfileSkeleton } from '../components/skeletons';
import { useFeedRefresh } from '../contexts/FeedRefreshContext';

const ProfileScreen = ({ navigation }) => {
  const { showLoader, hideLoader } = useLoader();
  const { registerUpdatePostReaction } = useFeedRefresh() || {};
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('About');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [skillModalVisible, setSkillModalVisible] = useState(false);
  const [experienceModalVisible, setExperienceModalVisible] = useState(false);
  const [educationModalVisible, setEducationModalVisible] = useState(false);
  const [topicModalVisible, setTopicModalVisible] = useState(false);
  const [removeTopicModalVisible, setRemoveTopicModalVisible] = useState(false);
  const [topicToRemove, setTopicToRemove] = useState(null);
  const [removeSkillModalVisible, setRemoveSkillModalVisible] = useState(false);
  const [skillToRemove, setSkillToRemove] = useState(null);
  const [newSkill, setNewSkill] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newExperience, setNewExperience] = useState({
    company: '',
    role: '',
    startDate: '',
    endDate: '',
    description: '',
    isCurrentRole: false
  });
  const [newEducation, setNewEducation] = useState({
    institution: '',
    degree: '',
    fieldOfStudy: '',
    startDate: '',
    endDate: '',
    grade: '',
    isCurrent: false
  });
  const [editingExperience, setEditingExperience] = useState(null);
  const [editingEducation, setEditingEducation] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  useScreenApiLogger('Profile');

  const updatePostReactionInProfile = useCallback((postId, { added, reactionType = 'LIKE' }) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p?.id !== postId) return p;
        const currentCount = p.counts?.reactions ?? 0;
        const newCount = Math.max(0, currentCount + (added ? 1 : -1));
        return {
          ...p,
          counts: { ...p.counts, reactions: newCount },
          userReaction: added ? reactionType : null,
        };
      })
    );
  }, []);

  useEffect(() => {
    return registerUpdatePostReaction?.(updatePostReactionInProfile);
  }, [registerUpdatePostReaction, updatePostReactionInProfile]);

  useEffect(() => {
    initializeProfile();
  }, []);

  // Reload data when screen comes into focus (e.g., after editing profile)
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated && user) {
        // Refresh user data from AuthManager first, then reload
        authManager.refreshUserData();
        loadCurrentUserData();
      }
    }, [isAuthenticated])
  );

  const initializeProfile = async () => {
    showLoader();
    try {
      const authState = authManager.getAuthState();
      if (!authState.isAuthenticated) {
        // AuthNavigator will handle navigation to login
        return;
      }
      setIsAuthenticated(true);
      await loadCurrentUserData();
    } catch (error) {
      console.error('Profile initialization error:', error);
    } finally {
      hideLoader();
    }
  };

  const loadCurrentUserData = async () => {
    try {
      setLoading(true);
      
      // Get user profile from AuthManager (includes connectionsCount from backend)
      await authManager.refreshUserData();
      const currentUser = authManager.getCurrentUser();
      
      if (currentUser) {
        // Transform API data to match UI expectations
        const transformedUser = {
          id: currentUser.userId,
          name: currentUser.name,
          designation: currentUser.profession || 'User',
          bio: currentUser.bio || 'Add a bio to tell others about yourself',
          profilePic: currentUser.profilePic,
          email: currentUser.email,
          connectionsCount: currentUser.connectionsCount ?? 0, // From profile API, or fetched below
          topics: currentUser.topics || [],
          skills: currentUser.skills || [],
          workExperience: currentUser.experiences?.map(exp => ({
            id: exp.id,
            company: exp.company,
            position: exp.role,
            duration: `${new Date(exp.startDate).getFullYear()} - ${exp.endDate ? new Date(exp.endDate).getFullYear() : 'Present'}`,
            description: exp.description,
            isCurrentRole: exp.isCurrentRole
          })) || [],
          education: currentUser.education?.map(edu => ({
            id: edu.id,
            institution: edu.institution,
            degree: edu.degree,
            fieldOfStudy: edu.fieldOfStudy,
            duration: `${new Date(edu.startDate).getFullYear()} - ${edu.endDate ? new Date(edu.endDate).getFullYear() : 'Present'}`,
            grade: edu.grade,
            isCurrent: edu.isCurrent
          })) || [],
          rawData: currentUser // Keep original data for updates
        };

        // connectionsCount comes from profile API; fetch only if not present
        if (transformedUser.connectionsCount === 0 && currentUser.connectionsCount === undefined) {
          try {
            const connectionsResult = await ConnectionApi.getConnections(1, 1);
            if (connectionsResult.success && connectionsResult.data) {
              transformedUser.connectionsCount =
                connectionsResult.data.pagination?.total ?? 0;
            }
          } catch (error) {
            console.log('Could not fetch connections count:', error);
          }
        }

        setUser(transformedUser);
      } else {
        // If no profile exists, show setup prompt
        Alert.alert(
          'Profile Setup Required', 
          'Please complete your profile setup to continue.',
          [
            {
              text: 'Setup Profile',
              onPress: () => {
                // Clear user data to trigger profile setup flow
                authManager.authState.user = null;
                authManager.notifyListeners();
              },
            },
          ]
        );
        return;
      }
      
      // Load user posts using PostApi (includes both posts and reposts)
      try {
        const userId = authManager.getCurrentUser()?.userId;
        if (userId) {
          const postsResult = await postApi.getUserPosts(userId, 1, 50); // Increased limit to get more posts including reposts
          if (postsResult.success) {
            // Extract posts array from the response data structure
            // The API should return both regular posts and reposts
            let postsArray = postsResult.data?.posts || postsResult.data || [];
            
            // Handle different response structures
            if (!Array.isArray(postsArray)) {
              // If data is an object with posts array inside
              postsArray = postsArray.posts || [];
            }
            
            const allPosts = Array.isArray(postsArray) ? postsArray : [];
            
            // Process posts - backend now sends reposts with correct structure:
            // - isRepost: true
            // - repostComment: "..." (optional)
            // - originalPost: { ... } (nested original post with full details)
            // - author: { ... } (person who reposted - you)
            // - counts: { ... } (repost's own counts)
            const processedPosts = allPosts.map(post => {
              // If it's a repost, ensure all fields are properly set
              if (post.isRepost === true && post.originalPost) {
                return {
                  ...post,
                  isRepost: true,
                  originalPost: post.originalPost,
                  repostComment: post.repostComment || null,
                  // Ensure author is set (person who reposted)
                  author: post.author || {
                    id: userId,
                    profile: {
                      name: user?.name || 'You',
                      profession: user?.designation || 'User',
                      profilePic: user?.profilePic
                    }
                  },
                  // Ensure counts are set
                  counts: post.counts || {
                    reactions: 0,
                    comments: 0,
                    reposts: 0
                  }
                };
              }
              // Regular post - return as is
              return post;
            });
            
            // Log to verify reposts are included
            const repostsCount = processedPosts.filter(p => p.isRepost === true).length;
            console.log(`[Profile] Loaded ${processedPosts.length} posts (${repostsCount} reposts)`);
            if (repostsCount > 0) {
              console.log('[Profile] Reposts found:', processedPosts.filter(p => p.isRepost === true).map(p => ({
                id: p.id,
                hasOriginalPost: !!p.originalPost,
                repostComment: p.repostComment,
                originalPostId: p.originalPost?.id,
                originalAuthor: p.originalPost?.author?.profile?.name
              })));
            }
            
            // Sort by createdAt (newest first) to show reposts and posts chronologically
            const sortedPosts = processedPosts.sort((a, b) => {
              const dateA = new Date(a.createdAt || 0);
              const dateB = new Date(b.createdAt || 0);
              return dateB - dateA;
            });
            
            setPosts(sortedPosts);
          } else {
            console.error('Failed to load user posts:', postsResult.message);
            setPosts([]);
          }
        }
      } catch (error) {
        console.error('Error loading user posts:', error);
        setPosts([]);
      }
    } catch (error) {
      console.error('Error loading current user data:', error);
      Alert.alert('Error', 'Failed to load profile data.');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const handleEditProfile = () => {
    closeMenu();
    navigation.navigate('EditProfile', { existingData: user });
  };
  
  const handleRegisteredEvents = () => {
    closeMenu();
    navigation.navigate('RegisteredEvents');
  };

  const handleSettings = () => {
    closeMenu();
    navigation.navigate('Settings');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCurrentUserData();
    setRefreshing(false);
  };

  const handleAddExperience = () => {
    setEditingExperience(null);
    setNewExperience({
      company: '',
      role: '',
      startDate: '',
      endDate: '',
      description: '',
      isCurrentRole: false
    });
    setExperienceModalVisible(true);
  };

  const handleEditExperience = (experience) => {
    setEditingExperience(experience);
    setNewExperience({
      company: experience.company,
      role: experience.position,
      startDate: new Date(user.rawData.experiences.find(exp => exp.id === experience.id)?.startDate || '').getFullYear().toString(),
      endDate: experience.isCurrentRole ? '' : new Date(user.rawData.experiences.find(exp => exp.id === experience.id)?.endDate || '').getFullYear().toString(),
      description: experience.description || '',
      isCurrentRole: experience.isCurrentRole
    });
    setExperienceModalVisible(true);
  };

  const handleSaveExperience = async () => {
    if (!newExperience.company.trim() || !newExperience.role.trim() || !newExperience.startDate.trim()) {
      Alert.alert('Error', 'Please fill in company, role, and start date');
      return;
    }

    setModalLoading(true);
    try {
      let updatedExperiences = [...(user.rawData.experiences || [])];
      
      const experienceData = {
        company: newExperience.company.trim(),
        role: newExperience.role.trim(),
        startDate: `${newExperience.startDate}-01-01T00:00:00.000Z`,
        endDate: newExperience.isCurrentRole ? null : `${newExperience.endDate}-12-31T00:00:00.000Z`,
        description: newExperience.description.trim(),
        isCurrentRole: newExperience.isCurrentRole
      };

      if (editingExperience) {
        // Update existing experience
        const index = updatedExperiences.findIndex(exp => exp.id === editingExperience.id);
        if (index !== -1) {
          updatedExperiences[index] = { ...updatedExperiences[index], ...experienceData };
        }
      } else {
        // Add new experience
        updatedExperiences.push({
          ...experienceData,
          id: Date.now().toString(),
          profileId: user.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      
      const updateData = {
        ...user.rawData,
        experiences: updatedExperiences
      };
      
      const result = await profileApi.updateProfile(updateData);
      if (result.success) {
        await loadCurrentUserData();
        setExperienceModalVisible(false);
        Alert.alert('Success', `Experience ${editingExperience ? 'updated' : 'added'} successfully!`);
      } else {
        Alert.alert('Error', result.message || 'Failed to save experience');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save experience. Please try again.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleAddEducation = () => {
    setEditingEducation(null);
    setNewEducation({
      institution: '',
      degree: '',
      fieldOfStudy: '',
      startDate: '',
      endDate: '',
      grade: '',
      isCurrent: false
    });
    setEducationModalVisible(true);
  };

  const handleEditEducation = (education) => {
    setEditingEducation(education);
    setNewEducation({
      institution: education.institution,
      degree: education.degree,
      fieldOfStudy: education.fieldOfStudy || '',
      startDate: new Date(user.rawData.education.find(edu => edu.id === education.id)?.startDate || '').getFullYear().toString(),
      endDate: education.isCurrent ? '' : new Date(user.rawData.education.find(edu => edu.id === education.id)?.endDate || '').getFullYear().toString(),
      grade: education.grade || '',
      isCurrent: education.isCurrent
    });
    setEducationModalVisible(true);
  };

  const handleSaveEducation = async () => {
    if (!newEducation.institution.trim() || !newEducation.degree.trim() || !newEducation.startDate.trim()) {
      Alert.alert('Error', 'Please fill in institution, degree, and start date');
      return;
    }

    setModalLoading(true);
    try {
      let updatedEducation = [...(user.rawData.education || [])];
      
      const educationData = {
        institution: newEducation.institution.trim(),
        degree: newEducation.degree.trim(),
        fieldOfStudy: newEducation.fieldOfStudy.trim(),
        startDate: `${newEducation.startDate}-01-01T00:00:00.000Z`,
        endDate: newEducation.isCurrent ? null : `${newEducation.endDate}-12-31T00:00:00.000Z`,
        grade: newEducation.grade.trim(),
        isCurrent: newEducation.isCurrent
      };

      if (editingEducation) {
        // Update existing education
        const index = updatedEducation.findIndex(edu => edu.id === editingEducation.id);
        if (index !== -1) {
          updatedEducation[index] = { ...updatedEducation[index], ...educationData };
        }
      } else {
        // Add new education
        updatedEducation.push({
          ...educationData,
          id: Date.now().toString(),
          profileId: user.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      
      const updateData = {
        ...user.rawData,
        education: updatedEducation
      };
      
      const result = await profileApi.updateProfile(updateData);
      if (result.success) {
        await loadCurrentUserData();
        setEducationModalVisible(false);
        Alert.alert('Success', `Education ${editingEducation ? 'updated' : 'added'} successfully!`);
      } else {
        Alert.alert('Error', result.message || 'Failed to save education');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save education. Please try again.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleAddTopic = () => {
    setNewTopic('');
    setTopicModalVisible(true);
  };

  const handleSaveTopic = async () => {
    if (!newTopic.trim()) {
      Alert.alert('Error', 'Please enter a topic');
      return;
    }

    // Check if topic already exists
    if (user.topics && user.topics.includes(newTopic.trim())) {
      Alert.alert('Error', 'This topic already exists');
      return;
    }

    setModalLoading(true);
    try {
      const updatedTopics = [...(user.topics || []), newTopic.trim()];
      const updateData = {
        ...user.rawData,
        topics: updatedTopics
      };
      
      const result = await profileApi.updateProfile(updateData);
      if (result.success) {
        await loadCurrentUserData();
        setTopicModalVisible(false);
        setNewTopic('');
        Alert.alert('Success', 'Topic added successfully!');
      } else {
        Alert.alert('Error', result.message || 'Failed to add topic');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add topic. Please try again.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleRemoveTopic = (topic) => {
    setTopicToRemove(topic);
    setRemoveTopicModalVisible(true);
  };

  const confirmRemoveTopic = async () => {
    if (!topicToRemove) return;

    setModalLoading(true);
    try {
      const updatedTopics = user.topics.filter(topic => topic !== topicToRemove);
      const updateData = {
        ...user.rawData,
        topics: updatedTopics
      };
      
      const result = await profileApi.updateProfile(updateData);
      if (result.success) {
        await loadCurrentUserData();
        setRemoveTopicModalVisible(false);
        setTopicToRemove(null);
        Alert.alert('Success', 'Topic removed successfully!');
      } else {
        Alert.alert('Error', result.message || 'Failed to remove topic');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to remove topic. Please try again.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleAddSkill = () => {
    setNewSkill('');
    setSkillModalVisible(true);
  };

  const handleSaveSkill = async () => {
    if (!newSkill.trim()) {
      Alert.alert('Error', 'Please enter a skill');
      return;
    }

    setModalLoading(true);
    try {
      const updatedTopics = [...(user.skills || []), newSkill.trim()];
      const updateData = {
        ...user.rawData,
        topics: updatedTopics
      };
      
      const result = await profileApi.updateProfile(updateData);
      if (result.success) {
        await loadCurrentUserData();
        setSkillModalVisible(false);
        setNewSkill('');
        Alert.alert('Success', 'Skill added successfully!');
      } else {
        Alert.alert('Error', result.message || 'Failed to add skill');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add skill. Please try again.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleRemoveSkill = (skill) => {
    setSkillToRemove(skill);
    setRemoveSkillModalVisible(true);
  };

  const confirmRemoveSkill = async () => {
    if (!skillToRemove) return;

    setModalLoading(true);
    try {
      const updatedSkills = user.skills.filter(skill => skill !== skillToRemove);
      const updateData = {
        ...user.rawData,
        skills: updatedSkills
      };
      
      const result = await profileApi.updateProfile(updateData);
      if (result.success) {
        await loadCurrentUserData();
        setRemoveSkillModalVisible(false);
        setSkillToRemove(null);
        Alert.alert('Success', 'Skill removed successfully!');
      } else {
        Alert.alert('Error', result.message || 'Failed to remove skill');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to remove skill. Please try again.');
    } finally {
      setModalLoading(false);
    }
  };

  const handlePostDeleted = (postId) => {
    setPosts((prev) => prev.filter((p) => p?.id !== postId));
  };

  const renderPostsSection = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.postsContainer}>
        {posts && Array.isArray(posts) ? posts.map(post => (
          <PostCard key={post.id} post={post} style={styles.postCard} onPostDeleted={handlePostDeleted} />
        )) : (
          <Text style={styles.emptyText}>No posts yet</Text>
        )}
      </View>
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title="Profile" />
        <ProfileSkeleton showPosts={true} />
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
    <View style={{ flex: 1, backgroundColor: colors.background}}>
      {/* Header */}
      <Header title="Profile" />
      
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <CustomRefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        {/* Top Bar with 3-dot menu - Always show for current user */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }} />
          <Pressable onPress={handleMenu} hitSlop={12} style={styles.menuButton}>
            <Icon name="dots-vertical" size={28} color={colors.textPrimary} />
          </Pressable>
        </View>
          
        <Modal
          visible={menuVisible}
          transparent
          animationType="fade"
          onRequestClose={closeMenu}
        >
          <Pressable style={styles.menuOverlay} onPress={closeMenu}>
            <View style={styles.menuContainer}>
              <Pressable style={styles.menuItem} onPress={handleEditProfile}>
                <Text style={styles.menuText}>Edit Profile</Text>
              </Pressable>
              <Pressable style={styles.menuItem} onPress={handleRegisteredEvents}>
                <Text style={styles.menuText}>Registered Events</Text>
              </Pressable>
              <Pressable style={styles.menuItem} onPress={handleSettings}>
                <Text style={styles.menuText}>Settings</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image
              source={getProfileImageSource(user, { fallbackKey: user.profilePic })}
              style={styles.avatar}
              resizeMode="cover"
            />
            <View style={styles.avatarBorder} />
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.designation}>{user.designation || 'No designation'}</Text>
          {user.connectionsCount !== undefined && (
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{user.connectionsCount}</Text>
                <Text style={styles.statLabel}>Connections</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{posts?.length || 0}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
            </View>
          )}
          <TouchableOpacity style={styles.editProfileButton} onPress={handleEditProfile} activeOpacity={0.8}>
            <Icon name="pencil" size={16} color={colors.white} />
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
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
            {/* About Box */}
            <View style={styles.aboutBox}>
              <View style={styles.aboutHeader}>
                <Icon name="information-outline" size={20} color={colors.button} />
                <Text style={styles.aboutLabel}>About</Text>
              </View>
              <Text style={styles.aboutText}>{user.bio || 'No bio added yet. Tell others about yourself!'}</Text>
            </View>

            {/* Topics Section */}
            {user.topics && user.topics.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <Icon name="tag-outline" size={22} color={colors.white} />
                  <Text style={styles.sectionTitle}>Topics of Interest</Text>
                  <TouchableOpacity style={styles.headerIcon} onPress={handleEditProfile}>
                    <Icon name="pencil" size={20} color={colors.white} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.headerIcon} onPress={handleAddTopic}>
                    <Icon name="plus" size={22} color={colors.white} />
                  </TouchableOpacity>
                </View>
                <View style={styles.skillsContainer}>
                  {user.topics.map((topic, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={styles.skillPill}
                      onLongPress={() => handleRemoveTopic(topic)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.skillText}>{topic}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Skills Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Icon name="lightbulb-outline" size={22} color={colors.white} />
                <Text style={styles.sectionTitle}>Skills</Text>
                <TouchableOpacity style={styles.headerIcon} onPress={handleEditProfile}>
                  <Icon name="pencil" size={20} color={colors.white} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerIcon} onPress={handleAddSkill}>
                  <Icon name="plus" size={22} color={colors.white} />
                </TouchableOpacity>
              </View>
              <View style={styles.skillsContainer}>
                {user.skills?.length > 0 ? user.skills.map((skill, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.skillPill}
                    onLongPress={() => handleRemoveSkill(skill)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.skillText}>{skill}</Text>
                  </TouchableOpacity>
                )) : (
                  <View style={styles.emptyStateContainer}>
                    <Icon name="lightbulb-outline" size={32} color={colors.textMuted} />
                    <Text style={styles.emptyText}>No skills added yet</Text>
                    <Text style={styles.emptySubText}>Tap the + icon to add your skills</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Work Experience Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Icon name="briefcase-outline" size={22} color={colors.white} />
                <Text style={styles.sectionTitle}>Work Experience</Text>
                <TouchableOpacity style={styles.headerIcon} onPress={handleEditProfile}>
                  <Icon name="pencil" size={20} color={colors.white} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerIcon} onPress={handleAddExperience}>
                  <Icon name="plus" size={22} color={colors.white} />
                </TouchableOpacity>
              </View>
              {user.workExperience?.length > 0 ? user.workExperience.map((work) => (
                <TouchableOpacity 
                  key={work.id} 
                  style={styles.experienceCard}
                  onPress={() => handleEditExperience(work)}
                  activeOpacity={0.8}
                >
                  <View style={styles.companyIconContainer}>
                    <Icon name="domain" size={24} color={colors.white} />
                  </View>
                  <View style={styles.experienceCardContent}>
                    <View style={styles.companyPill}>
                      <Text style={styles.companyPillText}>{work.company}</Text>
                    </View>
                    <Text style={styles.experiencePosition}>{work.position}</Text>
                    <Text style={styles.experienceDuration}>{work.duration}</Text>
                    {work.description && (
                      <Text style={styles.experienceDescription} numberOfLines={2}>{work.description}</Text>
                    )}
                  </View>
                  <Icon name="chevron-right" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              )) : (
                <View style={styles.emptyStateContainer}>
                  <Icon name="briefcase-outline" size={32} color={colors.textMuted} />
                  <Text style={styles.emptyText}>No work experience added yet</Text>
                  <Text style={styles.emptySubText}>Tap the + icon to add your experience</Text>
                </View>
              )}
            </View>

            {/* Education Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Icon name="school-outline" size={22} color={colors.white} />
                <Text style={styles.sectionTitle}>Education</Text>
                <TouchableOpacity style={styles.headerIcon} onPress={handleEditProfile}>
                  <Icon name="pencil" size={20} color={colors.white} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerIcon} onPress={handleAddEducation}>
                  <Icon name="plus" size={22} color={colors.white} />
                </TouchableOpacity>
              </View>
              {user.education?.length > 0 ? user.education.map((edu) => (
                <TouchableOpacity 
                  key={edu.id} 
                  style={styles.experienceCard}
                  onPress={() => handleEditEducation(edu)}
                  activeOpacity={0.8}
                >
                  <View style={styles.companyIconContainer}>
                    <Icon name="school" size={24} color={colors.white} />
                  </View>
                  <View style={styles.experienceCardContent}>
                    <View style={styles.companyPill}>
                      <Text style={styles.companyPillText}>{edu.institution}</Text>
                    </View>
                    <Text style={styles.experiencePosition}>
                      {edu.degree}
                      {edu.fieldOfStudy && ` in ${edu.fieldOfStudy}`}
                    </Text>
                    <Text style={styles.experienceDuration}>{edu.duration}</Text>
                    {edu.grade && (
                      <Text style={styles.experienceDescription}>Grade: {edu.grade}</Text>
                    )}
                  </View>
                  <Icon name="chevron-right" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              )) : (
                <View style={styles.emptyStateContainer}>
                  <Icon name="school-outline" size={32} color={colors.textMuted} />
                  <Text style={styles.emptyText}>No education added yet</Text>
                  <Text style={styles.emptySubText}>Tap the + icon to add your education</Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.postsContainer}>
            {posts && Array.isArray(posts) && posts.length > 0 ? posts.map(post => (
              <PostCard key={post.id} post={post} style={styles.postCard} onPostDeleted={handlePostDeleted} />
            )) : (
              <View style={styles.emptyStateContainer}>
                <Icon name="newspaper-variant-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>No posts yet</Text>
                <Text style={styles.emptySubText}>Start sharing your thoughts with the community</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Skill Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={skillModalVisible}
        onRequestClose={() => setSkillModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Skill</Text>
              <TouchableOpacity onPress={() => setSkillModalVisible(false)}>
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Enter skill (e.g., JavaScript, Python, Design)"
              placeholderTextColor={colors.textMuted}
              value={newSkill}
              onChangeText={setNewSkill}
              autoFocus={true}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setSkillModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={handleSaveSkill}
                disabled={modalLoading}
              >
                {modalLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Add Skill</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Experience Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={experienceModalVisible}
        onRequestClose={() => setExperienceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingExperience ? 'Edit Experience' : 'Add Experience'}
              </Text>
              <TouchableOpacity onPress={() => setExperienceModalVisible(false)}>
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollView}>
              <TextInput
                style={styles.modalInput}
                placeholder="Company Name"
                placeholderTextColor={colors.textMuted}
                value={newExperience.company}
                onChangeText={(text) => setNewExperience({...newExperience, company: text})}
              />
              
              <TextInput
                style={styles.modalInput}
                placeholder="Job Title/Role"
                placeholderTextColor={colors.textMuted}
                value={newExperience.role}
                onChangeText={(text) => setNewExperience({...newExperience, role: text})}
              />
              
              <TextInput
                style={styles.modalInput}
                placeholder="Start Year (e.g., 2020)"
                placeholderTextColor={colors.textMuted}
                value={newExperience.startDate}
                onChangeText={(text) => setNewExperience({...newExperience, startDate: text})}
                keyboardType="numeric"
              />
              
              <TouchableOpacity 
                style={styles.checkboxContainer}
                onPress={() => setNewExperience({...newExperience, isCurrentRole: !newExperience.isCurrentRole})}
              >
                <Icon 
                  name={newExperience.isCurrentRole ? "checkbox-marked" : "checkbox-blank-outline"} 
                  size={24} 
                  color={colors.primary} 
                />
                <Text style={styles.checkboxText}>I currently work here</Text>
              </TouchableOpacity>
              
              {!newExperience.isCurrentRole && (
                <TextInput
                  style={styles.modalInput}
                  placeholder="End Year (e.g., 2023)"
                  placeholderTextColor={colors.textMuted}
                  value={newExperience.endDate}
                  onChangeText={(text) => setNewExperience({...newExperience, endDate: text})}
                  keyboardType="numeric"
                />
              )}
              
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                placeholder="Job Description (optional)"
                placeholderTextColor={colors.textMuted}
                value={newExperience.description}
                onChangeText={(text) => setNewExperience({...newExperience, description: text})}
                multiline={true}
                numberOfLines={4}
              />
            </ScrollView>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setExperienceModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={handleSaveExperience}
                disabled={modalLoading}
              >
                {modalLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingExperience ? 'Update' : 'Add'} Experience
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Topic Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={topicModalVisible}
        onRequestClose={() => setTopicModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Topic</Text>
              <TouchableOpacity onPress={() => setTopicModalVisible(false)}>
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Enter topic (e.g., React Native, AI, Blockchain)"
              placeholderTextColor={colors.textMuted}
              value={newTopic}
              onChangeText={setNewTopic}
              autoFocus={true}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setTopicModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={handleSaveTopic}
                disabled={modalLoading}
              >
                {modalLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Add Topic</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Education Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={educationModalVisible}
        onRequestClose={() => setEducationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingEducation ? 'Edit Education' : 'Add Education'}
              </Text>
              <TouchableOpacity onPress={() => setEducationModalVisible(false)}>
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollView}>
              <TextInput
                style={styles.modalInput}
                placeholder="Institution/University Name"
                placeholderTextColor={colors.textMuted}
                value={newEducation.institution}
                onChangeText={(text) => setNewEducation({...newEducation, institution: text})}
              />
              
              <TextInput
                style={styles.modalInput}
                placeholder="Degree (e.g., Bachelor's, Master's)"
                placeholderTextColor={colors.textMuted}
                value={newEducation.degree}
                onChangeText={(text) => setNewEducation({...newEducation, degree: text})}
              />
              
              <TextInput
                style={styles.modalInput}
                placeholder="Field of Study (optional)"
                placeholderTextColor={colors.textMuted}
                value={newEducation.fieldOfStudy}
                onChangeText={(text) => setNewEducation({...newEducation, fieldOfStudy: text})}
              />
              
              <TextInput
                style={styles.modalInput}
                placeholder="Start Year (e.g., 2020)"
                placeholderTextColor={colors.textMuted}
                value={newEducation.startDate}
                onChangeText={(text) => setNewEducation({...newEducation, startDate: text})}
                keyboardType="numeric"
              />
              
              <TouchableOpacity 
                style={styles.checkboxContainer}
                onPress={() => setNewEducation({...newEducation, isCurrent: !newEducation.isCurrent})}
              >
                <Icon 
                  name={newEducation.isCurrent ? "checkbox-marked" : "checkbox-blank-outline"} 
                  size={24} 
                  color={colors.primary} 
                />
                <Text style={styles.checkboxText}>I currently study here</Text>
              </TouchableOpacity>
              
              {!newEducation.isCurrent && (
                <TextInput
                  style={styles.modalInput}
                  placeholder="End Year (e.g., 2024)"
                  placeholderTextColor={colors.textMuted}
                  value={newEducation.endDate}
                  onChangeText={(text) => setNewEducation({...newEducation, endDate: text})}
                  keyboardType="numeric"
                />
              )}
              
              <TextInput
                style={styles.modalInput}
                placeholder="Grade/CGPA (optional)"
                placeholderTextColor={colors.textMuted}
                value={newEducation.grade}
                onChangeText={(text) => setNewEducation({...newEducation, grade: text})}
              />
            </ScrollView>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setEducationModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={handleSaveEducation}
                disabled={modalLoading}
              >
                {modalLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingEducation ? 'Update' : 'Add'} Education
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Remove Topic Confirmation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={removeTopicModalVisible}
        onRequestClose={() => setRemoveTopicModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Remove Topic</Text>
              <TouchableOpacity onPress={() => {
                setRemoveTopicModalVisible(false);
                setTopicToRemove(null);
              }}>
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.removeModalContent}>
              <Icon name="alert-circle-outline" size={48} color={colors.button} style={styles.removeModalIcon} />
              <Text style={styles.removeModalText}>
                Are you sure you want to remove "{topicToRemove}"?
              </Text>
              <Text style={styles.removeModalSubtext}>
                This action cannot be undone.
              </Text>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  setRemoveTopicModalVisible(false);
                  setTopicToRemove(null);
                }}
                disabled={modalLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.removeButton]} 
                onPress={confirmRemoveTopic}
                disabled={modalLoading}
              >
                {modalLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.removeButtonText}>Remove</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Remove Skill Confirmation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={removeSkillModalVisible}
        onRequestClose={() => setRemoveSkillModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Remove Skill</Text>
              <TouchableOpacity onPress={() => {
                setRemoveSkillModalVisible(false);
                setSkillToRemove(null);
              }}>
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.removeModalContent}>
              <Icon name="alert-circle-outline" size={48} color={colors.button} style={styles.removeModalIcon} />
              <Text style={styles.removeModalText}>
                Are you sure you want to remove "{skillToRemove}"?
              </Text>
              <Text style={styles.removeModalSubtext}>
                This action cannot be undone.
              </Text>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  setRemoveSkillModalVisible(false);
                  setSkillToRemove(null);
                }}
                disabled={modalLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.removeButton]} 
                onPress={confirmRemoveSkill}
                disabled={modalLoading}
              >
                {modalLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.removeButtonText}>Remove</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 8,
    paddingBottom: 4,
    paddingHorizontal: 15,
  },
  menuButton: {
    padding: 4,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginTop: 48,
    marginRight: 12,
    paddingVertical: 8,
    minWidth: 160,
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  menuText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontFamily: 'Gilroy-SemiBold',
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 8,
    paddingBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: { 
    width: 120, 
    height: 120, 
    borderRadius: 60,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 3,
    borderColor: colors.border,
  },
  avatarBorder: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: colors.button,
    opacity: 0.3,
  },
  name: { 
    fontSize: 26, 
    fontFamily: 'Gilroy-Bold', 
    color: colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  designation: { 
    fontSize: 15, 
    color: colors.textMuted,
    fontFamily: 'Gilroy-Medium',
    textAlign: 'center',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: 'Gilroy-Regular',
    color: colors.textMuted,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.button,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  editProfileText: {
    color: colors.white,
    fontSize: 14,
    fontFamily: 'Gilroy-SemiBold',
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
    fontFamily: 'Gilroy-SemiBold',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.white,
  },
  aboutSection: {
    paddingHorizontal: 15,
  },
  aboutBox: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 24,
    marginBottom: 20,
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
  },
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  aboutLabel: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: colors.textPrimary,
    marginLeft: 8,
  },
  aboutText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontFamily: 'Gilroy-Regular',
    lineHeight: 24,
    textAlign: 'left',
  },
  sectionContainer: {
    marginBottom: 20,
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 24,
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
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: colors.textPrimary,
    flex: 1,
    marginLeft: 10,
  },
  headerIcon: {
    padding: 4,
    marginLeft: 8,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillPill: {
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    marginBottom: 8,
  },
  skillText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: 'Gilroy-Medium',
  },
  experienceCard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
  },
  companyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.button,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  experienceCardContent: {
    flex: 1,
  },
  companyPill: {
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  companyPillText: {
    fontSize: 14,
    fontFamily: 'Gilroy-SemiBold',
    color: colors.white,
  },
  experiencePosition: {
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: 'Gilroy-Medium',
    marginBottom: 4,
  },
  experienceDuration: {
    fontSize: 13,
    color: colors.textMuted,
    fontFamily: 'Gilroy-Regular',
    marginBottom: 4,
  },
  experienceDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: 'Gilroy-Regular',
    marginTop: 6,
    lineHeight: 18,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    width: '100%',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Gilroy-SemiBold',
    color: colors.textPrimary,
    marginTop: 12,
    textAlign: 'center',
    width: '100%',
  },
  emptySubText: {
    fontSize: 13,
    fontFamily: 'Gilroy-Regular',
    color: colors.textMuted,
    marginTop: 6,
    textAlign: 'center',
    width: '100%',
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'Gilroy-Bold',
    color: colors.textPrimary,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.card,
    placeholderTextColor: colors.textMuted,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  charCount: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: -12,
    marginBottom: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkboxText: {
    marginLeft: 12,
    fontSize: 16,
    color: colors.textPrimary,
    fontFamily: 'Gilroy-Medium',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  cancelButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.button,
  },
  cancelButtonText: {
    fontSize: 16,
    color: colors.textPrimary,
    fontFamily: 'Gilroy-SemiBold',
  },
  saveButtonText: {
    fontSize: 16,
    color: colors.white,
    fontFamily: 'Gilroy-SemiBold',
  },
  removeModalContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  removeModalIcon: {
    marginBottom: 16,
  },
  removeModalText: {
    fontSize: 16,
    fontFamily: 'Gilroy-SemiBold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  removeModalSubtext: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  removeButton: {
    backgroundColor: '#ef4444',
  },
  removeButtonText: {
    fontSize: 16,
    color: colors.white,
    fontFamily: 'Gilroy-SemiBold',
  },
});

export default ProfileScreen;

