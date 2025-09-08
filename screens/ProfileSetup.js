import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import colors from '../config/colors';
import profileApi from '../api/ProfileApi';
import authApi from '../api/AuthApi';
import { useLoader } from '../context/LoaderContext';

const ProfileSetupScreen = ({ navigation, route }) => {
  const [photoUri, setPhotoUri] = useState(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [profession, setProfession] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { showLoader, hideLoader } = useLoader();

  // Check authentication status on component mount
  useEffect(() => {
    checkAuthStatus();
    
    // If in edit mode, populate existing data
    if (route?.params?.editMode && route?.params?.existingData) {
      const data = route.params.existingData;
      setName(data.name || '');
      setProfession(data.designation || '');
      setEmail(data.email || '');
      setBio(data.bio || '');
      setLocation(data.location || '');
      if (data.profilePic) {
        setPhotoUri(data.profilePic);
      }
    }
  }, [route?.params]);

  const checkAuthStatus = async () => {
    try {
      const authStatus = await authApi.checkAuthStatus();
      if (!authStatus.isAuthenticated) {
        Alert.alert(
          'Authentication Required',
          'Please complete OTP verification first.',
          [
            {
              text: 'Go to Login',
              onPress: () => navigation.navigate('OTPVerification'),
            },
          ]
        );
        return;
      }
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Auth check error:', error);
      navigation.navigate('OTPVerification');
    }
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload a profile photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Check file size (limit to 5MB)
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please choose an image smaller than 5MB.');
          return;
        }

        setPhotoUri(asset.uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      Alert.alert('Authentication Error', 'Please complete OTP verification first.');
      return;
    }

    // Validate required fields
    if (!name.trim()) {
      Alert.alert('Missing Information', 'Please enter your full name.');
      return;
    }

    if (!profession.trim()) {
      Alert.alert('Missing Information', 'Please enter your profession.');
      return;
    }

    // Validate profile data
    const profileData = {
      name: name.trim(),
      profession: profession.trim(),
      email: email.trim() || undefined,
      bio: bio.trim() || undefined,
      location: location.trim() || undefined,
    };

    const validation = profileApi.validateProfileData(profileData);
    if (!validation.isValid) {
      Alert.alert('Invalid Information', validation.errors.join('\n'));
      return;
    }

    setIsLoading(true);
    showLoader();

    try {
      // Create profile using the new API structure
      const result = await profileApi.createOrUpdateProfile(profileData);

      if (result.success) {
        Alert.alert(
          'Success!',
          'Your profile has been created successfully.',
          [
            {
              text: 'Continue',
              onPress: () => navigation.navigate('MainTabs', { screen: 'Profile' }),
            },
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to save profile. Please try again.');
      }
    } catch (error) {
      console.error('Profile setup error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
      hideLoader();
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Profile Setup?',
      'You can complete your profile later from the profile tab.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Skip',
          onPress: () => navigation.navigate('MainTabs', { screen: 'Profile' }),
        },
      ]
    );
  };

  return (
    <LinearGradient
      colors={[colors.background, colors.backgroundSecondary, colors.background]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logoText}>SciAstra</Text>
            <Text style={styles.title}>
              {route?.params?.editMode ? 'Edit Your Profile' : 'Complete Your Profile'}
            </Text>
            <Text style={styles.subtitle}>
              {route?.params?.editMode 
                ? 'Update your information to keep your profile current'
                : 'Help others discover you by sharing\na bit about yourself'
              }
            </Text>
          </View>

          {/* Profile Photo Section */}
          <View style={styles.photoSection}>
            <TouchableOpacity 
              onPress={pickImage} 
              style={styles.photoContainer}
              disabled={isImageUploading}
            >
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Icon name="camera-plus" size={32} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.avatarPlaceholderText}>Add Photo</Text>
                </View>
              )}
              <View style={styles.photoOverlay}>
                {isImageUploading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Icon name="camera" size={20} color="white" />
                )}
              </View>
            </TouchableOpacity>
            <Text style={styles.photoHint}>
              Add a photo to help others recognize you
            </Text>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                value={name}
                onChangeText={setName}
                placeholderTextColor="rgba(255,255,255,0.5)"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Profession *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Software Engineer, Student"
                value={profession}
                onChangeText={setProfession}
                placeholderTextColor="rgba(255,255,255,0.5)"
                maxLength={100}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="your.email@example.com"
                value={email}
                onChangeText={setEmail}
                placeholderTextColor="rgba(255,255,255,0.5)"
                keyboardType="email-address"
                autoCapitalize="none"
                maxLength={100}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Bio</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                placeholder="Tell us about yourself..."
                value={bio}
                onChangeText={setBio}
                placeholderTextColor="rgba(255,255,255,0.5)"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={styles.characterCount}>
                {bio.length}/500 characters
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Location</Text>
              <TextInput
                style={styles.input}
                placeholder="Your city, country"
                value={location}
                onChangeText={setLocation}
                placeholderTextColor="rgba(255,255,255,0.5)"
                maxLength={100}
              />
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[styles.continueButton, isLoading && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              <LinearGradient
                colors={isLoading ? ['#666', '#777'] : ['#8a2be2', '#9932cc']}
                style={styles.gradientButton}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="white" style={styles.loadingSpinner} />
                    <Text style={styles.continueButtonText}>Saving Profile...</Text>
                  </View>
                ) : (
                  <Text style={styles.continueButtonText}>Complete Profile</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.skipButton, isLoading && styles.disabledButton]}
              onPress={handleSkip}
              disabled={isLoading}
            >
              <Text style={[styles.skipText, isLoading && styles.disabledText]}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
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
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
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
  photoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  photoContainer: {
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#8a2be2',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#8a2be2',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  formSection: {
    marginBottom: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: 'white',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  bioInput: {
    minHeight: 80,
    paddingTop: 14,
  },
  actionSection: {
    alignItems: 'center',
  },
  continueButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  gradientButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
  },
  continueButtonText: {
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
  photoHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  characterCount: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  disabledText: {
    opacity: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingSpinner: {
    marginRight: 8,
  },
});

export default ProfileSetupScreen;
