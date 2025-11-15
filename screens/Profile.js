// screens/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, Alert, RefreshControl, TextInput, ActivityIndicator } from 'react-native';
import Container from '../components/Container';
import colors from '../config/colors';
import authManager from '../services/AuthManager';
import postApi from '../api/PostApi';
import PostCard from '../components/PostCard';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Modal, Pressable } from 'react-native';
import Header from '../components/Header';
import { useLoader } from "../context/LoaderContext";
import ConnectionApi from '../api/ConnectionApi';
import useScreenApiLogger from '../hooks/useScreenApiLogger';

const ProfileScreen = ({ navigation }) => {
  const { showLoader, hideLoader } = useLoader();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('About');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [skillModalVisible, setSkillModalVisible] = useState(false);
  const [experienceModalVisible, setExperienceModalVisible] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [newExperience, setNewExperience] = useState({
    company: '',
    role: '',
    startDate: '',
    endDate: '',
    description: '',
    isCurrentRole: false
  });
  const [editingExperience, setEditingExperience] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  useScreenApiLogger('Profile');

  useEffect(() => {
    initializeProfile();
  }, []);

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
      
      // Get user profile from AuthManager
      authManager.refreshUserData();
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
          connectionsCount: 0, // Will be updated below
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

        // Fetch actual connections count
        try {
          const connectionsResult = await ConnectionApi.getConnections(1, 1);
          if (connectionsResult.success && connectionsResult.data) {
            const totalConnections = connectionsResult.data.pagination?.total || 0;
            transformedUser.connectionsCount = totalConnections;
          }
        } catch (error) {
          console.log('Could not fetch connections count:', error);
          transformedUser.connectionsCount = 0;
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
      
      // Load user posts using PostApi
      try {
        const userId = authManager.getCurrentUser()?.userId;
        if (userId) {
          const postsResult = await postApi.getUserPosts(userId, 1, 10);
          if (postsResult.success) {
            // Extract posts array from the response data structure
            const postsArray = postsResult.data?.posts || postsResult.data || [];
            setPosts(Array.isArray(postsArray) ? postsArray : []);
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
    Alert.alert('Add Education', 'Education management will be available soon.');
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

  const handleRemoveSkill = async (skillToRemove) => {
    Alert.alert(
      'Remove Skill',
      `Are you sure you want to remove "${skillToRemove}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedTopics = user.skills.filter(skill => skill !== skillToRemove);
              const updateData = {
                ...user.rawData,
                topics: updatedTopics
              };
              
              const result = await profileApi.updateProfile(updateData);
              if (result.success) {
                await loadCurrentUserData();
                Alert.alert('Success', 'Skill removed successfully!');
              } else {
                Alert.alert('Error', result.message || 'Failed to remove skill');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to remove skill. Please try again.');
            }
          }
        }
      ]
    );
  };


  const renderPostsSection = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.postsContainer}>
        {posts && Array.isArray(posts) ? posts.map(post => (
          <PostCard key={post.id} post={post} style={styles.postCard} />
        )) : (
          <Text style={styles.emptyText}>No posts yet</Text>
        )}
      </View>
    </ScrollView>
  );

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
    <View style={{ flex: 1, backgroundColor: colors.background}}>
      {/* Header */}
      <Header title="PROFILE" />
      
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
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
          <Image
            source={user.profilePic ? { uri: user.profilePic } : require('../assets/icon.png')}
            style={styles.avatar}
          />
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.designation}>{user.designation}</Text>
          <TouchableOpacity style={styles.editProfileButton} onPress={handleEditProfile}>
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
              <Text style={styles.aboutLabel}>About</Text>
              <Text style={styles.aboutText}>{user.bio}</Text>
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
                  <TouchableOpacity style={styles.headerIcon}>
                    <Icon name="plus" size={22} color={colors.white} />
                  </TouchableOpacity>
                </View>
                <View style={styles.skillsContainer}>
                  {user.topics.map((topic, index) => (
                    <View key={index} style={styles.skillPill}>
                      <Text style={styles.skillText}>{topic}</Text>
                    </View>
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
                  <View key={index} style={styles.skillPill}>
                    <Text style={styles.skillText}>{skill}</Text>
                  </View>
                )) : (
                  <Text style={styles.emptyText}>No skills added yet.</Text>
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
                <View key={work.id} style={styles.experienceCard}>
                  <View style={styles.companyIconContainer}>
                    <Icon name="domain" size={24} color={colors.white} />
                  </View>
                  <View style={styles.experienceCardContent}>
                    <View style={styles.companyPill}>
                      <Text style={styles.companyPillText}>{work.company}</Text>
                    </View>
                    <Text style={styles.experiencePosition}>{work.position}</Text>
                    <Text style={styles.experienceDuration}>{work.duration}</Text>
                  </View>
                </View>
              )) : (
                <Text style={styles.emptyText}>No work experience added yet.</Text>
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
                <View key={edu.id} style={styles.experienceCard}>
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
                  </View>
                </View>
              )) : (
                <Text style={styles.emptyText}>No education added yet.</Text>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.postsContainer}>
            {posts && Array.isArray(posts) ? posts.map(post => (
              <PostCard key={post.id} post={post} style={styles.postCard} />
            )) : (
              <Text style={styles.emptyText}>No posts yet</Text>
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
    fontFamily: 'Gilroy-Bold', 
    color: colors.primary,
    marginBottom: 4,
  },
  designation: { 
    fontSize: 16, 
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: 16,
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
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  aboutLabel: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: colors.white,
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  sectionContainer: {
    marginBottom: 20,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: colors.white,
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
    gap: 8,
  },
  skillPill: {
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
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
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 12,
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
});

export default ProfileScreen;

