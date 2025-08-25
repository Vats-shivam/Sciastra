// screens/EditProfileScreen.js
import React, { useState } from 'react';
import { TextInput, StyleSheet, Image, TouchableOpacity, Text, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Container from '../components/Container';
import Button from '../components/Button';
import colors from '../config/colors';

const EditProfileScreen = ({ navigation }) => {
  const [photoUri, setPhotoUri] = useState(null);
  const [name, setName] = useState('Alice Johnson');
  const [bio, setBio] = useState('Tech Enthusiast and Product Manager');
  const [location, setLocation] = useState('Bangalore');

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

  const handleSave = () => {
    // Save changes to backend here (mocked)
    Alert.alert('Profile updated');
    navigation.goBack();
  };

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
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Name" placeholderTextColor={colors.textSecondary} />
      <TextInput style={styles.input} value={bio} onChangeText={setBio} placeholder="Bio" placeholderTextColor={colors.textSecondary} />
      <TextInput
        style={styles.input}
        value={location}
        onChangeText={setLocation}
        placeholder="Location"
        placeholderTextColor={colors.textSecondary}
      />
      <Button title="Save" onPress={handleSave} />
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
  },
});

export default EditProfileScreen;
