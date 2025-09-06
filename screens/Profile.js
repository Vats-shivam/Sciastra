// screens/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import Container from '../components/Container';
import colors from '../config/colors';
import { api } from '../api/MockApi';
import PostCard from '../components/PostCard';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Modal, Pressable } from 'react-native';
import Header from '../components/Header';
import { useLoader } from "../context/LoaderContext";

const ProfileScreen = ({ navigation }) => {
  const { showLoader, hideLoader } = useLoader();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('About');

  useEffect(() => {
    showLoader();
    loadCurrentUserData().finally(hideLoader);
  }, []);

  const loadCurrentUserData = async () => {
    try {
      setLoading(true);
      const currentUser = await api.getCurrentUser();
      const userPosts = await api.getUserPosts('1'); // Current user ID is '1'
      
      setUser(currentUser);
      setPosts(userPosts);
    } catch (error) {
      console.error('Error loading current user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const handleEditProfile = () => {
    closeMenu();
    navigation.navigate('EditProfile');
  };
  
  const handleRegisteredEvents = () => {
    closeMenu();
    navigation.navigate('RegisteredEvents');
  };

  const handleSettings = () => {
    closeMenu();
    navigation.navigate('Settings');
  };

  const renderAboutSection = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.aboutSection}>
        <Text style={styles.aboutText}>{user.bio}</Text>
        
        {/* Connections Count */}
        <View style={styles.connectionsContainer}>
          <Text style={styles.connectionsCount}>{user.connectionsCount}+ Connections</Text>
        </View>

        {/* Skills Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Icon name="lightbulb-outline" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Skills</Text>
            <TouchableOpacity style={styles.editIcon}>
              <Icon name="pencil" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.addIcon}>
              <Icon name="plus" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.skillsContainer}>
            {user.skills?.map((skill, index) => (
              <View key={index} style={styles.skillChip}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Work Experience Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Icon name="briefcase-outline" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Work Experience</Text>
            <TouchableOpacity style={styles.editIcon}>
              <Icon name="pencil" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.addIcon}>
              <Icon name="plus" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
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
          ))}
        </View>

        {/* Education Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Icon name="school-outline" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Education</Text>
            <TouchableOpacity style={styles.editIcon}>
              <Icon name="pencil" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.addIcon}>
              <Icon name="plus" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
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
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const renderPostsSection = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.postsContainer}>
        {posts.map(post => (
          <PostCard key={post.id} post={post} style={styles.postCard} />
        ))}
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
      
      <ScrollView style={{ flex: 1 }}>
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
            <Text style={styles.aboutText}>{user.bio}</Text>
            
            {/* Connections Count */}
            <View style={styles.connectionsContainer}>
              <Text style={styles.connectionsCount}>{user.connectionsCount}+ Connections</Text>
            </View>

            {/* Skills Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Icon name="lightbulb-outline" size={24} color={colors.primary} />
                <Text style={styles.sectionTitle}>Skills</Text>
                <TouchableOpacity style={styles.editIcon}>
                  <Icon name="pencil" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.addIcon}>
                  <Icon name="plus" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={styles.skillsContainer}>
                {user.skills?.map((skill, index) => (
                  <View key={index} style={styles.skillChip}>
                    <Text style={styles.skillText}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Work Experience Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Icon name="briefcase-outline" size={24} color={colors.primary} />
                <Text style={styles.sectionTitle}>Work Experience</Text>
                <TouchableOpacity style={styles.editIcon}>
                  <Icon name="pencil" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.addIcon}>
                  <Icon name="plus" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
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
              ))}
            </View>

            {/* Education Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Icon name="school-outline" size={24} color={colors.primary} />
                <Text style={styles.sectionTitle}>Education</Text>
                <TouchableOpacity style={styles.editIcon}>
                  <Icon name="pencil" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.addIcon}>
                  <Icon name="plus" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
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
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.postsContainer}>
            {posts.map(post => (
              <PostCard key={post.id} post={post} style={styles.postCard} />
            ))}
          </View>
        )}
      </ScrollView>
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
    fontWeight: '600',
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
    fontWeight: '600',
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
  editIcon: {
    padding: 4,
    marginRight: 8,
  },
  addIcon: {
    padding: 4,
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
  postsContainer: {
    paddingHorizontal: 15,
  },
  postCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
});

export default ProfileScreen;
