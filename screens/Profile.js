// screens/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import Container from '../components/Container';
import colors from '../config/colors';
import { api } from '../api/MockApi';
import PostCard from '../components/PostCard';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Modal, Pressable } from 'react-native';

const ProfileScreen = ({ navigation }) => {
  // Mock user info and posts fetch
  const [user, setUser] = useState({
    name: 'John Doe',
    designation: 'Software Engineer',
    email: 'johndoe@gmail.com',
    phone: '1234567890',
    profilePic: null,
  });

  const [posts, setPosts] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    api.fetchFeedPosts().then(setPosts);
  }, []);

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

  return (
    <Container>
      {/* Top Bar with 3-dot menu */}
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
          </View>
        </Pressable>
      </Modal>
      <ScrollView>
        <View style={styles.profileInfo}>
          <Image
            source={user.profilePic ? { uri: user.profilePic } : require('../assets/icon.png')}
            style={styles.avatar}
          />
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.designation}>{user.designation}</Text>
          <Text style={styles.info}>{user.email}</Text>
          <Text style={styles.info}>{user.phone}</Text>
        </View>
        <Text style={styles.sectionTitle}>My Posts</Text>
        {posts.map(post => (
          <PostCard key={post.id} post={post} style={styles.postCard} />
        ))}
      </ScrollView>
    </Container>
  );
};

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 8,
    paddingBottom: 4,
    paddingHorizontal: 8,
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
  profileInfo: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 12 },
  name: { fontSize: 24, fontWeight: '700', color: colors.primary },
  designation: { fontSize: 16, color: colors.secondary },
  info: { fontSize: 14, color: colors.textSecondary, marginVertical: 2 },
  editButton: {
    marginTop: 12,
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
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
  postText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  viewMore: {
    color: colors.accent,
    marginTop: 8,
    fontWeight: '600',
  },
});

export default ProfileScreen;
