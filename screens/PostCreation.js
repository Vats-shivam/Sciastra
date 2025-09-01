// screens/PostCreationScreen.js
import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <Header title="CREATE POST" />
      
      <Container>
        <TextInput
          style={styles.textInput}
          placeholder="What's on your mind?"
          multiline
          value={text}
          onChangeText={setText}
          placeholderTextColor={colors.textSecondary}
        />
        <Button title={imageUri ? 'Change Image' : 'Add Image'} onPress={pickImage} />
        {imageUri && <Image source={{ uri: imageUri }} style={styles.imagePreview} />}
        <View style={styles.visibilityContainer}>
          <Button
            title="Public"
            buttonColor={visibility === 'public' ? colors.accent : colors.secondary}
            onPress={() => setVisibility('public')}
          />
          <Button
            title="Connections"
            buttonColor={visibility === 'connections' ? colors.accent : colors.secondary}
            onPress={() => setVisibility('connections')}
          />
        </View>
        <Button title="Post" onPress={handlePost} loading={loading} />
      </Container>
    </View>
  );
};

const styles = StyleSheet.create({
  textInput: {
    borderColor: colors.textSecondary,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    color: colors.textPrimary,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginVertical: 10,
  },
  visibilityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 12,
  },
});

export default PostCreationScreen;
