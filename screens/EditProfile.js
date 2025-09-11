// screens/EditProfileScreen.js
import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, Image, TouchableOpacity, Text, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Container from '../components/Container';
import Button from '../components/Button';
import colors from '../config/colors';
import authManager from '../services/AuthManager';
import profileApi from '../api/ProfileApi';
import { useLoader } from '../context/LoaderContext';

const EditProfileScreen = ({ navigation }) => {
  const [photoUri, setPhotoUri] = useState(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [profession, setProfession] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const { showLoader, hideLoader } = useLoader();

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission required', 'Please grant camera roll permissions');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  // Load current user data on component mount
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const currentUser = authManager.getCurrentUser();
      
      if (currentUser) {
        setName(currentUser.name || '');
        setBio(currentUser.bio || '');
        setLocation(currentUser.location || '');
        setProfession(currentUser.profession || currentUser.designation || '');
        setEmail(currentUser.email || '');
        setPhotoUri(currentUser.profilePic || null);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Validate required fields
      if (!name.trim()) {
        Alert.alert('Error', 'Name is required');
        return;
      }

      if (!profession.trim()) {
        Alert.alert('Error', 'Profession is required');
        return;
      }

      showLoader();

      // Prepare profile data
      const profileData = {
        name: name.trim(),
        bio: bio.trim(),
        location: location.trim(),
        profession: profession.trim(),
        email: email.trim(),
      };

      // Validate profile data
      const validation = profileApi.validateProfileData(profileData);
      if (!validation.isValid) {
        Alert.alert('Validation Error', validation.errors.join('\n'));
        return;
      }

      // Update profile with or without image
      let result;
      if (photoUri && photoUri !== authManager.getCurrentUser()?.profilePic) {
        // User selected a new image, use completeProfileSetup for image upload
        result = await profileApi.completeProfileSetup(profileData, photoUri);
      } else {
        // No new image, just update profile data
        result = await profileApi.updateProfile(profileData);
      }

      if (result.success) {
        // Refresh user data in AuthManager
        await authManager.refreshUserData();
        
        Alert.alert('Success', result.message || 'Profile updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Error', result.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      hideLoader();
    }
  };

  if (loading) {
    return (
      <Container>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </Container>
    );
  }

  return (
    <Container>
      <TouchableOpacity onPress={pickImage}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarPlaceholderText}>Change Photo</Text>
          </View>
        )}
      </TouchableOpacity>
      
      <TextInput 
        style={styles.input} 
        value={name} 
        onChangeText={setName} 
        placeholder="Full Name *" 
        placeholderTextColor={colors.textSecondary}
        maxLength={50}
      />
      
      <TextInput 
        style={styles.input} 
        value={profession} 
        onChangeText={setProfession} 
        placeholder="Profession/Designation *" 
        placeholderTextColor={colors.textSecondary}
        maxLength={100}
      />
      
      <TextInput 
        style={styles.input} 
        value={email} 
        onChangeText={setEmail} 
        placeholder="Email" 
        placeholderTextColor={colors.textSecondary}
        keyboardType="email-address"
        maxLength={100}
      />
      
      <TextInput 
        style={[styles.input, styles.textArea]} 
        value={bio} 
        onChangeText={setBio} 
        placeholder="Bio" 
        placeholderTextColor={colors.textSecondary}
        multiline
        numberOfLines={3}
        maxLength={500}
      />
      
      <TextInput
        style={styles.input}
        value={location}
        onChangeText={setLocation}
        placeholder="Location"
        placeholderTextColor={colors.textSecondary}
        maxLength={100}
      />
      
      <Button title="Save Changes" onPress={handleSave} />
    </Container>
  );
};

const styles = StyleSheet.create({
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginBottom: 20,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: colors.secondary,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  avatarPlaceholderText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  input: {
    borderColor: colors.textSecondary,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    color: colors.textPrimary,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textPrimary,
    fontSize: 16,
  },
});

export default EditProfileScreen;
