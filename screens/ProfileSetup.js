// screens/ProfileSetupScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Container from '../components/Container';
import Button from '../components/Button';
import colors from '../config/colors';

const ProfileSetupScreen = ({ navigation }) => {
  const [photoUri, setPhotoUri] = useState(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');

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

  const handleSubmit = () => {
    if (!name || !bio || !location) {
      Alert.alert('Missing Info', 'Please fill all fields');
      return;
    }
    // Save profile info to backend or local storage (mocked here)
    // Navigate to SuggestedConnections screen
    navigation.replace('SuggestedConnections');
  };

  return (
    <Container>
      <Text style={styles.title}>Set up your profile</Text>
      <TouchableOpacity onPress={pickImage}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarPlaceholderText}>Upload Photo</Text>
          </View>
        )}
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        placeholder="Your name"
        value={name}
        onChangeText={setName}
        placeholderTextColor={colors.textSecondary}
      />
      <TextInput
        style={styles.input}
        placeholder="Bio"
        value={bio}
        onChangeText={setBio}
        placeholderTextColor={colors.textSecondary}
      />
      <TextInput
        style={styles.input}
        placeholder="Location"
        value={location}
        onChangeText={setLocation}
        placeholderTextColor={colors.textSecondary}
      />
      <Button title="Continue" onPress={handleSubmit} />
    </Container>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginVertical: 20,
    color: colors.primary,
    textAlign: 'center',
  },
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
  },
});

export default ProfileSetupScreen;
