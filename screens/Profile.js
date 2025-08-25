// screens/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import Container from '../components/Container';
import colors from '../config/colors';
import { api } from '../api/MockApi';
import PostCard from '../components/PostCard';

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

  useEffect(() => {
    api.fetchFeedPosts().then(setPosts);
  }, []);

  return (
    <Container>
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
          <TouchableOpacity style={styles.editButton} onPress={() => navigation.navigate('EditProfile')}>
            <Text style={{ color: colors.white, fontWeight: '700' }}>Edit Profile</Text>
          </TouchableOpacity>
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
