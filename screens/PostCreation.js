import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import colors from '../config/colors';
import postApi from '../api/PostApi';
import Header from '../components/Header';
import authManager from '../services/AuthManager';
import { useNotification } from '../contexts/NotificationContext';
import useScreenApiLogger from '../hooks/useScreenApiLogger';
import { getProfileImageSource } from '../utils/profileImage';
import authApi from '../api/AuthApi';
import profileApi from '../api/ProfileApi';

const { width } = Dimensions.get('window');

const VISIBILITY_OPTIONS = [
  {
    id: 'public',
    label: 'Public',
    description: 'Anyone on SciAstra can see this post',
    icon: 'earth',
  },
  {
    id: 'connections',
    label: 'Connections',
    description: 'Only your connections can see this post',
    icon: 'account-group',
  },
];

const PostCreationScreen = ({ navigation }) => {
  const [text, setText] = useState('');
  const [images, setImages] = useState([]); // Changed to array for multiple images
  const [visibility, setVisibility] = useState('public');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [textInputFocused, setTextInputFocused] = useState(false);
  const [userName, setUserName] = useState('You'); // Default fallback
  const [userProfilePic, setUserProfilePic] = useState(null);
  const [showVisibilityPicker, setShowVisibilityPicker] = useState(false);
  const { showError, showSuccess, showWarning } = useNotification();

  useScreenApiLogger('PostCreation');

  // Load user information on component mount
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const currentUser = authManager.getCurrentUser();
        if (currentUser?.name) {
          setUserName(currentUser.name);
        }
        
        // Load profile picture
        try {
          const profileResult = await profileApi.getProfile();
          if (profileResult.success && profileResult.data) {
            setUserProfilePic(profileResult.data.profilePic);
          }
        } catch (error) {
          console.log('Could not load profile picture');
        }
      } catch (error) {
        console.log('Could not load user info, using fallback');
        // Keep default 'You' fallback
      }
    };

    loadUserInfo();
  }, []);

  const pickImages = async () => {
    if (images.length >= 5) {
      showWarning('You can only add up to 5 images per post.');
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      showWarning('Please grant camera roll permissions to add images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 5 - images.length,
    });

    if (!result.canceled) {
      const newImages = result.assets.map((asset, index) => ({
        id: `${Date.now()}_${index}`,
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        fileSize: asset.fileSize,
        fileName: asset.fileName || `image_${Date.now()}_${index}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
      }));
      setImages([...images, ...newImages]);
    }
  };

  const removeImage = (imageId) => {
    setImages(images.filter(img => img.id !== imageId));
  };

  const takePicture = async () => {
    if (images.length >= 5) {
      showWarning('You can only add up to 5 images per post.');
      return;
    }

    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      showWarning('Please grant camera permissions to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const newImage = {
        id: `${Date.now()}`,
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        fileSize: asset.fileSize,
        fileName: asset.fileName || `image_${Date.now()}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
      };
      setImages([...images, newImage]);
    }
  };

  const handlePost = async () => {
    if (!text.trim() && images.length === 0) {
      showWarning('Please write something or add an image to share.');
      return;
    }

    setLoading(true);
    try {
      // Prepare post data
      const postData = {
        content: text.trim(),
        topicNames: extractHashtags(text), // Extract hashtags from text
        privacy: visibility.toUpperCase(),
      };

      // Prepare media files for upload
      const selectedFiles = images.map((image, index) => ({
        uri: image.uri,
        fileName: image.fileName || `image_${Date.now()}_${index}.jpg`,
        contentType: image.mimeType || 'image/jpeg',
        size: image.fileSize || 1024000, // Default size if not available
        width: image.width,
        height: image.height,
        caption: '', // Could add caption support later
      }));

      console.log('📸 Creating post with data:', {
        content: postData.content,
        mediaCount: selectedFiles.length,
        privacy: postData.privacy
      });

      // Update progress for media uploads
      if (selectedFiles.length > 0) {
        setUploadProgress(`Uploading ${selectedFiles.length} image${selectedFiles.length > 1 ? 's' : ''}...`);
      }

      // Create post with media using the new API
      const result = await postApi.createPostWithMedia(postData, selectedFiles);

      setUploadProgress('Creating post...');

      if (result.success) {
        setUploadProgress('Post published successfully!');

        // Clean up memory
        setText('');
        setImages([]);
        setVisibility('public');
        showSuccess('Your post has been published successfully!');
        navigation.goBack();
      } else {
        const errorMessage = result.message || 'Failed to publish your post';
        console.error('Post creation failed:', errorMessage);
        showError(`${errorMessage}. Please check your connection and try again.`);
      }
    } catch (error) {
      console.error('Post creation error:', error);

      let errorMessage = 'Failed to publish your post';
      if (error.message.includes('network') || error.message.includes('Network')) {
        errorMessage = 'Network connection failed. Please check your internet connection and try again.';
      } else if (error.message.includes('upload')) {
        errorMessage = 'Media upload failed. Please try with different images or check your connection.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Upload timeout. Please try again with smaller images.';
      }

      showError(errorMessage);
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  // Helper function to extract hashtags from text
  const extractHashtags = (text) => {
    const hashtags = text.match(/#\w+/g);
    return hashtags ? hashtags.map(tag => tag.substring(1)) : [];
  };


  return (
    <View style={styles.container}>
      {/* Header */}
      <Header 
        title="CREATE POST"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />
      
      {/* Custom Post Button */}
      <View style={styles.postButtonContainer}>
        <TouchableOpacity
          style={[
            styles.postButton,
            (!text.trim() && images.length === 0) && styles.postButtonDisabled
          ]}
          onPress={handlePost}
          disabled={(!text.trim() && images.length === 0) || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.white} />
            </View>
          ) : (
            <Text style={[
              styles.postButtonText,
              (!text.trim() && images.length === 0) && styles.postButtonTextDisabled
            ]}>Post</Text>
          )}
        </TouchableOpacity>

        {/* Upload Progress */}
        {uploadProgress && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>{uploadProgress}</Text>
          </View>
        )}
      </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* User Info */}
          <View style={styles.userSection}>
            <Image
              source={getProfileImageSource({ profilePic: userProfilePic }, { fallbackKey: userProfilePic })}
              style={styles.userAvatar}
              resizeMode="cover"
              defaultSource={require('../assets/icon.png')}
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{userName}</Text>
              <TouchableOpacity
                style={styles.visibilitySelector}
                onPress={() => setShowVisibilityPicker(true)}
                activeOpacity={0.7}
              >
                <View style={styles.visibilityIconContainer}>
                  <Icon
                    name={visibility === 'public' ? 'earth' : 'account-group'}
                    size={14}
                    color={colors.button}
                  />
                </View>
                <Text style={styles.visibilityText}>
                  {visibility === 'public' ? 'Public' : 'Connections'}
                </Text>
                <Icon name="chevron-down" size={14} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Text Input */}
          <View style={styles.textInputContainer}>
            <TextInput
              style={[styles.textInput, textInputFocused && styles.textInputFocused]}
              placeholder="What's on your mind?"
              placeholderTextColor={colors.textMuted}
              multiline
              value={text}
              onChangeText={setText}
              onFocus={() => setTextInputFocused(true)}
              onBlur={() => setTextInputFocused(false)}
            />
            {text.length > 0 && (
              <View style={styles.charCountContainer}>
                <Text style={styles.charCount}>{text.length} characters</Text>
              </View>
            )}
          </View>

          {/* Image Preview Grid */}
          {images.length > 0 && (
            <View style={styles.imagesSection}>
              <View style={styles.imageGrid}>
                {images.map((item) => (
                  <View key={item.id} style={styles.imageContainer}>
                    <Image source={{ uri: item.uri }} style={styles.imagePreview} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(item.id)}
                    >
                      <Icon name="close" size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Media Actions */}
          <View style={styles.mediaActions}>
            <TouchableOpacity 
              style={styles.mediaButton} 
              onPress={pickImages}
              activeOpacity={0.8}
            >
              <View style={styles.mediaButtonContent}>
                <View style={styles.mediaIconContainer}>
                  <Icon name="image-multiple" size={22} color={colors.button} />
                </View>
                <View style={styles.mediaButtonTextContainer}>
                  <Text style={styles.mediaButtonText}>Photos</Text>
                  <Text style={styles.mediaButtonSubtext}>
                    {images.length}/5 images
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.mediaButton} 
              onPress={takePicture}
              activeOpacity={0.8}
            >
              <View style={styles.mediaButtonContent}>
                <View style={styles.mediaIconContainer}>
                  <Icon name="camera" size={22} color={colors.button} />
                </View>
                <View style={styles.mediaButtonTextContainer}>
                  <Text style={styles.mediaButtonText}>Camera</Text>
                  <Text style={styles.mediaButtonSubtext}>Take photo</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <Modal
          visible={showVisibilityPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowVisibilityPicker(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowVisibilityPicker(false)}
          >
            <View style={styles.visibilityModal}>
              <Text style={styles.modalTitle}>Choose who can see your post</Text>
              {VISIBILITY_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.visibilityOption,
                    visibility === option.id && styles.visibilityOptionActive,
                  ]}
                  onPress={() => {
                    setVisibility(option.id);
                    setShowVisibilityPicker(false);
                  }}
                >
                  <View style={styles.visibilityOptionLeft}>
                    <View style={styles.visibilityOptionIcon}>
                      <Icon
                        name={option.icon}
                        size={18}
                        color={visibility === option.id ? colors.black : '#8a2be2'}
                      />
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.visibilityOptionLabel,
                          visibility === option.id && styles.visibilityOptionLabelActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                      <Text style={styles.visibilityOptionDesc}>{option.description}</Text>
                    </View>
                  </View>
                  {visibility === option.id && (
                    <Icon name="check-circle" size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.visibilityCancelButton}
                onPress={() => setShowVisibilityPicker(false)}
              >
                <Text style={styles.visibilityCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  postButtonContainer: {
    position: 'absolute',
    top: 114,
    right: 16,
    zIndex: 10,
  },
  postButton: {
    backgroundColor: colors.button,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: colors.button,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  postButtonDisabled: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  postButtonText: {
    color: colors.white,
    fontFamily: 'Gilroy-SemiBold',
    fontSize: 15,
    backgroundColor: 'transparent',
  },
  postButtonTextDisabled: {
    color: colors.textMuted,
  },
  loadingContainer: {
    backgroundColor: 'transparent',
  },
  progressContainer: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(138, 43, 226, 0.15)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(138, 43, 226, 0.3)',
  },
  progressText: {
    color: colors.button,
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'Gilroy-Medium',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  userAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 14,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 2,
    borderColor: colors.border,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontFamily: 'Gilroy-SemiBold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  visibilitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
  },
  visibilityIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(138, 43, 226, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  visibilityText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: 'Gilroy-Medium',
    marginRight: 4,
  },
  textInputContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  textInput: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: colors.textPrimary,
    paddingVertical: 16,
    paddingHorizontal: 0,
    minHeight: 140,
    textAlignVertical: 'top',
    lineHeight: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  textInputFocused: {
    borderBottomWidth: 2,
    borderBottomColor: colors.button,
  },
  charCountContainer: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  charCount: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: colors.textMuted,
  },
  imagesSection: {
    marginVertical: 20,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageContainer: {
    position: 'relative',
    width: (width - 56) / 2,
    marginBottom: 0,
  },
  imagePreview: {
    width: '100%',
    height: 140,
    borderRadius: 16,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 16,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  mediaActions: {
    flexDirection: 'row',
    paddingVertical: 8,
    gap: 12,
    marginTop: 8,
  },
  mediaButton: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  mediaButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  mediaIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(138, 43, 226, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mediaButtonTextContainer: {
    flex: 1,
  },
  mediaButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: 'Gilroy-SemiBold',
    marginBottom: 2,
  },
  mediaButtonSubtext: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: 'Gilroy-Regular',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  visibilityModal: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    marginBottom: 20,
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    backgroundColor: colors.backgroundElevated,
  },
  visibilityOptionActive: {
    backgroundColor: 'rgba(138, 43, 226, 0.15)',
    borderColor: colors.button,
  },
  visibilityOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  visibilityOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(138, 43, 226, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  visibilityOptionLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: 'Gilroy-SemiBold',
  },
  visibilityOptionLabelActive: {
    color: colors.button,
  },
  visibilityOptionDesc: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    marginTop: 4,
    maxWidth: width * 0.55,
  },
  visibilityCancelButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: colors.backgroundElevated,
  },
  visibilityCancelText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontFamily: 'Gilroy-Medium',
  },
});

export default PostCreationScreen;
