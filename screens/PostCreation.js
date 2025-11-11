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
  ActivityIndicator,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import colors from '../config/colors';
import postApi from '../api/PostApi';
import Header from '../components/Header';
import authManager from '../services/AuthManager';
import { useNotification } from '../contexts/NotificationContext';
import useScreenApiLogger from '../hooks/useScreenApiLogger';

const { width } = Dimensions.get('window');

const PostCreationScreen = ({ navigation }) => {
  const [text, setText] = useState('');
  const [images, setImages] = useState([]); // Changed to array for multiple images
  const [visibility, setVisibility] = useState('public');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [textInputFocused, setTextInputFocused] = useState(false);
  const [userName, setUserName] = useState('You'); // Default fallback
  const { showError, showSuccess, showWarning } = useNotification();

  useScreenApiLogger('PostCreation');

  // Load user information on component mount
  useEffect(() => {
    const loadUserInfo = () => {
      try {
        const currentUser = authManager.getCurrentUser();
        if (currentUser?.name) {
          setUserName(currentUser.name);
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
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.postButtonText}>Post</Text>
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
              source={require('../assets/icon.png')} // Placeholder user avatar
              style={styles.userAvatar}
            />
            <View>
              <Text style={styles.userName}>{userName}</Text>
              <TouchableOpacity
                style={styles.visibilitySelector}
                onPress={() => {
                  Alert.alert(
                    'Post Visibility',
                    'Choose who can see your post',
                    [
                      { text: 'Public', onPress: () => setVisibility('public') },
                      { text: 'Connections Only', onPress: () => setVisibility('connections') },
                      { text: 'Cancel', style: 'cancel' },
                    ]
                  );
                }}
              >
                <Icon
                  name={visibility === 'public' ? 'earth' : 'account-group'}
                  size={16}
                  color="#8a2be2"
                />
                <Text style={styles.visibilityText}>
                  {visibility === 'public' ? 'Public' : 'Connections'}
                </Text>
                <Icon name="chevron-down" size={16} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Text Input */}
          <TextInput
            style={[styles.textInput, textInputFocused && styles.textInputFocused]}
            placeholder="What's on your mind?"
            placeholderTextColor="rgba(255,255,255,0.5)"
            multiline
            value={text}
            onChangeText={setText}
            onFocus={() => setTextInputFocused(true)}
            onBlur={() => setTextInputFocused(false)}
          />

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
            <TouchableOpacity style={styles.mediaButton} onPress={pickImages}>
              <LinearGradient
                colors={['rgba(138, 43, 226, 0.2)', 'rgba(138, 43, 226, 0.1)']}
                style={styles.mediaButtonGradient}
              >
                <Icon name="image-multiple" size={24} color="#8a2be2" />
                <Text style={styles.mediaButtonText}>
                  Photos ({images.length}/5)
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.mediaButton} onPress={takePicture}>
              <LinearGradient
                colors={['rgba(138, 43, 226, 0.2)', 'rgba(138, 43, 226, 0.1)']}
                style={styles.mediaButtonGradient}
              >
                <Icon name="camera" size={24} color="#8a2be2" />
                <Text style={styles.mediaButtonText}>Camera</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
    top: 114, // Adjust based on SafeAreaView + header height
    right: 16,
    zIndex: 10,
  },
  postButton: {
    backgroundColor: '#8a2be2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  postButtonDisabled: {
    backgroundColor: 'rgba(138, 43, 226, 0.3)',
  },
  postButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  progressContainer: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(138, 43, 226, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(138, 43, 226, 0.3)',
  },
  progressText: {
    color: '#8a2be2',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: colors.backgroundElevated,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  visibilitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(138, 43, 226, 0.3)',
  },
  visibilityText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginHorizontal: 4,
  },
  textInput: {
    fontSize: 18,
    color: 'white',
    paddingVertical: 20,
    paddingHorizontal: 0,
    minHeight: 120,
    textAlignVertical: 'top',
    lineHeight: 24,
  },
  textInputFocused: {
    borderBottomWidth: 2,
    borderBottomColor: '#8a2be2',
  },
  imagesSection: {
    marginVertical: 16,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  imageContainer: {
    position: 'relative',
    width: (width - 56) / 2, // Account for padding and gap
    marginBottom: 8,
  },
  imagePreview: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: colors.backgroundElevated,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaActions: {
    flexDirection: 'row',
    paddingVertical: 16,
    gap: 12,
  },
  mediaButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mediaButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(138, 43, 226, 0.3)',
  },
  mediaButtonText: {
    color: '#8a2be2',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default PostCreationScreen;
