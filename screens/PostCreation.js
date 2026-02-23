import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  Animated,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, CommonActions, useFocusEffect } from '@react-navigation/native';
import { BackHandler } from 'react-native';
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

// Prefill when editing (draft or published). Also re-run on focus to catch params passed via tab navigation.
const prefillFromParams = (params) => {
  if (!params?.isEditing) return;
  console.log('PostCreation prefillFromParams called with params:', params);

  // Draft edit case
  if (params?.draftPost) {
    const draft = params.draftPost;
    setText(draft.content || '');
    setVisibility((draft.privacy || 'PUBLIC').toLowerCase());
    // Support media as array or JSON string
    let rawMedia = draft.media;
    if (typeof rawMedia === 'string') {
      try { rawMedia = JSON.parse(rawMedia); } catch (e) { rawMedia = []; }
    }
    if (Array.isArray(rawMedia)) {
      const imgs = rawMedia.map((m, i) => ({
        id: m.key || m.id || `draft_${draft.id}_${i}`,
        uri: m.url || m.signedUrl || (m.key ? postApi.getMediaDisplayUrl(m.key) : null),
        key: m.key,
        width: m.width,
        height: m.height,
        fileName: m.fileName || `image_${i}.jpg`,
        mimeType: m.type || m.mediaType || 'image/jpeg',
      }));
      setImages(imgs);
    } else {
      setImages([]);
    }
  }

  // Published post edit case (including reposts)
  if (params?.post) {
    const p = params.post;
    setText(p.content || '');
    setVisibility((p.privacy || 'PUBLIC').toLowerCase());
    let rawMedia = p.media;
    if (typeof rawMedia === 'string') {
      try { rawMedia = JSON.parse(rawMedia); } catch (e) { rawMedia = []; }
    }
    if (Array.isArray(rawMedia)) {
      const imgs = rawMedia.map((m, i) => ({
        id: m.key || m.id || `post_${p.id}_${i}`,
        uri: m.url || m.signedUrl || (m.key ? postApi.getMediaDisplayUrl(m.key) : null),
        key: m.key,
        width: m.width,
        height: m.height,
        fileName: m.fileName || `image_${i}.jpg`,
        mimeType: m.type || m.mediaType || 'image/jpeg',
      }));
      setImages(imgs);
    } else {
      setImages([]);
    }
  }
};

useEffect(() => {
  console.log('PostCreation route.params changed:', route?.params);
  prefillFromParams(route?.params);
}, [route?.params]);

useFocusEffect(
  React.useCallback(() => {
    // Also attempt to read params again on focus (handles tab navigation param passing)
    console.log('PostCreation useFocusEffect - route.params:', route?.params);
    prefillFromParams(route?.params);
  }, [route?.params])
);

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

      // If editing an existing post (published, repost, or draft), update instead of creating
      let result;
      if (route?.params?.isEditing) {
        // If editing a draft and user clicks Post -> publish the draft
        if (route?.params?.draftPost?.id) {
          postData.status = 'PUBLISHED';
          result = await postApi.updatePostWithMedia(route.params.draftPost.id, postData, selectedFiles);
        } else if (route?.params?.post?.id) {
          // Editing a published post or repost - update existing
          result = await postApi.updatePostWithMedia(route.params.post.id, postData, selectedFiles);
        } else {
          // Fallback - create new
          result = await postApi.createPostWithMedia(postData, selectedFiles);
        }
      } else {
        // Create post with media using the new API
        result = await postApi.createPostWithMedia(postData, selectedFiles);
      }

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

  const handleSaveDraft = async () => {
    if (!text.trim() && images.length === 0) {
      showWarning('Please write something or add an image to save as draft.');
      return;
    }

    setLoading(true);
    try {
      const postData = {
        content: text.trim(),
        topicNames: extractHashtags(text),
        privacy: visibility.toUpperCase(),
        status: 'DRAFT'
      };

      const selectedFiles = images.map((image, index) => ({
        uri: image.uri,
        fileName: image.fileName || `image_${Date.now()}_${index}.jpg`,
        contentType: image.mimeType || 'image/jpeg',
        size: image.fileSize || 1024000,
        width: image.width,
        height: image.height,
        caption: '',
      }));
      let result;
      if (route?.params?.isEditing) {
        // If editing a draft
        if (route?.params?.draftPost?.id) {
          result = await postApi.updatePostWithMedia(route.params.draftPost.id, postData, selectedFiles);
        } else if (route?.params?.post?.id) {
          // Editing a published post (or repost)
          result = await postApi.updatePostWithMedia(route.params.post.id, postData, selectedFiles);
        } else {
          // Fallback to create
          result = await postApi.createPostWithMedia(postData, selectedFiles);
        }
      } else {
        result = await postApi.createPostWithMedia(postData, selectedFiles);
      }

      if (result.success) {
        setText('');
        setImages([]);
        setVisibility('public');
        showSuccess('Draft saved successfully');
        // If a proceed action was provided, call it (navigate)
        if (proceedActionRef.current) {
          navigation.dispatch(proceedActionRef.current);
          proceedActionRef.current = null;
        } else {
          navigation.goBack();
        }
      } else {
        showError(result.message || 'Failed to save draft. Please try again.');
      }
    } catch (error) {
      console.error('Save draft error:', error);
      showError('Failed to save draft. Please try again.');
    } finally {
      setLoading(false);
      setShowUnsavedModal(false);
    }
  };

  // Reference to store pending navigation action from beforeRemove listener
  const proceedActionRef = React.useRef(null);

  // Unsaved changes modal state
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (showUnsavedModal) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 120,
        useNativeDriver: true,
      }).start();
    }
  }, [showUnsavedModal]);

  // Register navigation blocker to prompt when user navigates away with content
  useEffect(() => {
    const handler = (e) => {
      console.log('beforeRemove handler fired, checking unsaved content');
      // If no content, don't block
      const hasContent = (text && text.trim().length > 0) || (images && images.length > 0);
      console.log('hasContent:', hasContent);
      if (!hasContent) return;

      // Prevent default behavior of leaving the screen
      e.preventDefault();

      // Save the pending action so we can dispatch it after user choice
      proceedActionRef.current = e.data.action;
      setShowUnsavedModal(true);
    };

    const unsubscribe = navigation.addListener('beforeRemove', handler);

    // Hardware back (Android) - intercept to show modal
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      const hasContent = (text && text.trim().length > 0) || (images && images.length > 0);
      if (!hasContent) return false; // allow default back behavior
      // store goBack action and show modal
      proceedActionRef.current = CommonActions.goBack();
      setShowUnsavedModal(true);
      return true; // prevent default
    });

    // Parent/tab navigator press - walk up ancestor chain and attach listeners (multiple navigator nesting)
    const tabUnsubs = [];
    let parent = navigation.getParent();
    let depth = 0;
    while (parent && depth < 4) {
      try {
        const unsub = parent.addListener('tabPress', (e) => {
          console.log('tabPress received at ancestor depth', depth, 'target:', e?.target);
          // Only intercept if this screen is currently focused
          if (!navigation.isFocused()) return;
          const hasContent = (text && text.trim().length > 0) || (images && images.length > 0);
          console.log('tabPress hasContent:', hasContent);
          if (!hasContent) return;
          // Prevent tab switch
          e.preventDefault();
          // Store navigation action to perform later (navigate by key if available)
          proceedActionRef.current = CommonActions.navigate({ key: e.target });
          setShowUnsavedModal(true);
        });
        tabUnsubs.push(unsub);
      } catch (err) {
        // ignore
      }
      parent = parent.getParent ? parent.getParent() : null;
      depth++;
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      backHandler.remove();
      if (tabUnsubs && tabUnsubs.length) {
        tabUnsubs.forEach((u) => { if (typeof u === 'function') u(); });
      }
    };
    // Intentionally include text/images so handler sees latest content
  }, [navigation, text, images]);

  // Helper to attempt navigation (used for header back)
  const attemptNavigateAway = (action = CommonActions.goBack()) => {
    const hasContent = (text && text.trim().length > 0) || (images && images.length > 0);
    if (!hasContent) {
      navigation.dispatch(action);
      return;
    }
    proceedActionRef.current = action;
    setShowUnsavedModal(true);
  };

  // Prevent tab switches / focus loss by re-focusing when there is unsaved content.
  const route = useRoute();
  const reFocusSuppressRef = React.useRef(false);
  useEffect(() => {
    const onBlur = () => {
      // If user already chose an action, allow navigation
      if (proceedActionRef.current) return;

      const hasContent = (text && text.trim().length > 0) || (images && images.length > 0);
      if (!hasContent) return;

      if (reFocusSuppressRef.current) return;

      // Show modal and re-focus this screen to prevent the switch
      setShowUnsavedModal(true);

      // Re-focus by navigating to this route again (works for tab/navigate)
      reFocusSuppressRef.current = true;
      navigation.dispatch(CommonActions.navigate({ name: route?.name }));
      // reset suppress after short delay
      setTimeout(() => { reFocusSuppressRef.current = false; }, 300);
    };

    const unsub = navigation.addListener('blur', onBlur);
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [navigation, route.name, text, images]);

  const handleConfirmDelete = () => {
    // Clear draft content and proceed with navigation
    setText('');
    setImages([]);
    setVisibility('public');
    setShowUnsavedModal(false);
    showSuccess('Draft discarded');
    if (proceedActionRef.current) {
      navigation.dispatch(proceedActionRef.current);
      proceedActionRef.current = null;
    } else {
      navigation.goBack();
    }
  };

  const handleConfirmSave = async () => {
    // Save draft and then proceed (handleSaveDraft handles proceedActionRef)
    await handleSaveDraft();
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
        onBackPress={() => attemptNavigateAway()}
      />
      
      {/* Custom Post Button - use View when loading to avoid TouchableOpacity disabled opacity */}
      <View style={styles.postButtonContainer}>
        {loading ? (
          <View
            style={[
              styles.postButton,
              styles.postButtonLoading,
            ]}
          >
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.postingText}>Posting...</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.postButton,
              (!text.trim() && images.length === 0) && styles.postButtonDisabled
            ]}
            onPress={handlePost}
            disabled={!text.trim() && images.length === 0}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.postButtonText,
              (!text.trim() && images.length === 0) && styles.postButtonTextDisabled
            ]}>Post</Text>
          </TouchableOpacity>
        )}
        {!loading && (
          <TouchableOpacity
            style={[styles.saveDraftButton]}
            onPress={handleSaveDraft}
            activeOpacity={0.8}
          >
            <Text style={styles.saveDraftButtonText}>Save Draft</Text>
          </TouchableOpacity>
        )}

        {/* Upload Progress - separate from button so it doesn't affect button width */}
        {uploadProgress && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>{uploadProgress}</Text>
          </View>
        )}
      </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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

          {/* Text Input - fixed height, scrollable when content overflows */}
          <View style={styles.textInputContainer}>
            <TextInput
              style={[styles.textInput, textInputFocused && styles.textInputFocused]}
              placeholder="What's on your mind?"
              placeholderTextColor={colors.textMuted}
              multiline
              scrollEnabled
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
        {/* Unsaved changes modal */}
        <Modal
          visible={showUnsavedModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowUnsavedModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowUnsavedModal(false)}
          >
            <Animated.View style={[styles.unsavedModal, { transform: [{ scale: scaleAnim }]}]}>
              <View style={styles.modalIconWrap}>
                <Icon name="content-save" size={36} color="#f08b3a" />
              </View>
              <Text style={styles.modalTitle}>Save to drafts?</Text>
              <Text style={styles.modalDesc}>Save to drafts to edit and post at a later time.</Text>

              <TouchableOpacity style={styles.savePrimaryButton} onPress={handleConfirmSave} activeOpacity={0.8}>
                <Text style={styles.savePrimaryText}>Save</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.deleteButton} onPress={handleConfirmDelete} activeOpacity={0.8}>
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </Animated.View>
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
    alignItems: 'flex-end',
  },
  postButton: {
    backgroundColor: colors.button,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    width: 110,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.button,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  postButtonLoading: {
    flexDirection: 'row',
    gap: 8,
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
  saveDraftButton: {
    marginTop: 8,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  saveDraftButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: 'Gilroy-SemiBold',
  },
  unsavedModal: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginHorizontal: 28,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff7ef',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalIcon: {
    width: 36,
    height: 36,
    resizeMode: 'contain'
  },
  modalDesc: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  savePrimaryButton: {
    backgroundColor: colors.button,
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  savePrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-SemiBold',
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: '#e74c3c',
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#e74c3c',
    fontSize: 16,
    fontFamily: 'Gilroy-SemiBold',
  },
  postingText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Gilroy-SemiBold',
  },
  progressContainer: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(20, 37, 45, 0.95)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(138, 43, 226, 0.5)',
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 13,
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
    height: 160,
    maxHeight: 160,
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
