// screens/PostCreationScreen.js
import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Image, TouchableOpacity, Alert, Text, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Container from '../components/Container';
import Button from '../components/Button';
import colors from '../config/colors';
import { api } from '../api/MockApi';
import Header from '../components/Header';

const PostCreationScreen = ({ navigation }) => {
  const [text, setText] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [visibility, setVisibility] = useState('public'); // or 'connections'
  const [loading, setLoading] = useState(false);

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
      setImageUri(result.assets[0].uri);
    }
  };

  const handlePost = async () => {
    if (!text && !imageUri) {
      Alert.alert('Empty Post', 'Please write something or select an image.');
      return;
    }
    setLoading(true);
    // Commented actual API call
    // await api.createPost({ text, imageUri, visibility });
    await new Promise(res => setTimeout(res, 1500));
    setLoading(false);
    Alert.alert('Posted!', 'Your post has been published.');
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Header />
      
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.titleContainer}>
              <Icon name="pencil-plus" size={28} color={colors.accent} />
              <Text style={styles.title}>Create Post</Text>
            </View>
            <Text style={styles.subtitle}>Share your thoughts with the community</Text>
          </View>

          {/* Text Input Section */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionLabel}>What's on your mind?</Text>
            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Share something interesting..."
                multiline
                value={text}
                onChangeText={setText}
                placeholderTextColor={colors.textSecondary}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Image Section */}
          <View style={styles.imageSection}>
            <Text style={styles.sectionLabel}>Add Media</Text>
            <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
              <Icon 
                name={imageUri ? "image-edit" : "image-plus"} 
                size={24} 
                color={colors.accent} 
              />
              <Text style={styles.imageButtonText}>
                {imageUri ? 'Change Image' : 'Add Image'}
              </Text>
            </TouchableOpacity>
            {imageUri && (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => setImageUri(null)}
                >
                  <Icon name="close-circle" size={24} color={colors.error} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Visibility Section */}
          <View style={styles.visibilitySection}>
            <Text style={styles.sectionLabel}>Who can see this?</Text>
            <View style={styles.visibilityContainer}>
              <TouchableOpacity
                style={[
                  styles.visibilityOption,
                  visibility === 'public' && styles.visibilityOptionActive
                ]}
                onPress={() => setVisibility('public')}
              >
                <Icon 
                  name="earth" 
                  size={20} 
                  color={visibility === 'public' ? colors.white : colors.textSecondary} 
                />
                <Text style={[
                  styles.visibilityText,
                  visibility === 'public' && styles.visibilityTextActive
                ]}>Public</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.visibilityOption,
                  visibility === 'connections' && styles.visibilityOptionActive
                ]}
                onPress={() => setVisibility('connections')}
              >
                <Icon 
                  name="account-group" 
                  size={20} 
                  color={visibility === 'connections' ? colors.white : colors.textSecondary} 
                />
                <Text style={[
                  styles.visibilityText,
                  visibility === 'connections' && styles.visibilityTextActive
                ]}>Connections</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Post Button */}
          <View style={styles.postButtonContainer}>
            <TouchableOpacity 
              style={[
                styles.postButton,
                (!text && !imageUri) && styles.postButtonDisabled
              ]}
              onPress={handlePost}
              disabled={loading || (!text && !imageUri)}
            >
              {loading ? (
                <Icon name="loading" size={20} color={colors.white} />
              ) : (
                <Icon name="send" size={20} color={colors.white} />
              )}
              <Text style={styles.postButtonText}>
                {loading ? 'Posting...' : 'Share Post'}
              </Text>
            </TouchableOpacity>
          </View>
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
  scrollContainer: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  
  // Header Section
  headerSection: {
    marginTop: 20,
    marginBottom: 30,
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    marginLeft: 12,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Input Section
  inputSection: {
    marginBottom: 25,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  textInputContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
  },
  textInput: {
    padding: 16,
    minHeight: 120,
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 22,
  },

  // Image Section
  imageSection: {
    marginBottom: 25,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.accent,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  imageButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: colors.accent,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginTop: 12,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.white,
    borderRadius: 12,
  },

  // Visibility Section
  visibilitySection: {
    marginBottom: 30,
  },
  visibilityContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  visibilityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  visibilityOptionActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  visibilityText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  visibilityTextActive: {
    color: colors.white,
  },

  // Post Button
  postButtonContainer: {
    marginTop: 10,
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingVertical: 18,
    shadowColor: colors.accent,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  postButtonDisabled: {
    backgroundColor: colors.textSecondary,
    shadowOpacity: 0,
    elevation: 0,
  },
  postButtonText: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
});

export default PostCreationScreen;
