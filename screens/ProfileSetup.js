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
import authManager from '../services/AuthManager';
import authApi from '../api/AuthApi';
import { useLoader } from '../context/LoaderContext';
import { useNotification } from '../contexts/NotificationContext';

const ProfileSetupScreen = ({ navigation, route }) => {
  const [photoUri, setPhotoUri] = useState(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [profession, setProfession] = useState('');
  const [email, setEmail] = useState('');
  const [topics, setTopics] = useState([]);
  const [skills, setSkills] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [education, setEducation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Input states for adding new items
  const [newTopic, setNewTopic] = useState('');
  const [newSkill, setNewSkill] = useState('');

  const { showLoader, hideLoader } = useLoader();
  const { showSuccess, showError } = useNotification();

  // Check authentication status on component mount
  useEffect(() => {
    checkAuthStatus();
    
    // If in edit mode, populate existing data
    if (route?.params?.editMode && route?.params?.existingData) {
      const data = route.params.existingData;
      setName(data.name || '');
      setProfession(data.profession || data.designation || '');
      setEmail(data.email || '');
      setBio(data.bio || '');
      setLocation(data.location || '');
      setTopics(data.topics || []);
      setSkills(data.skills || []);
      setExperiences(data.experiences || []);
      setEducation(data.education || []);
      if (data.profilePic) {
        setPhotoUri(data.profilePic);
      }
    }
  }, [route?.params]);

  const checkAuthStatus = async () => {
    try {
      const authState = authManager.getAuthState();
      if (!authState.isAuthenticated) {
        showError('Please complete authentication first.');
        setTimeout(() => {
          authManager.logout(); // This will trigger navigation back to login
        }, 2000);
        return;
      }
      setIsAuthenticated(true);
    } catch (error) {
      showError('Authentication error occurred.');
      // Let AuthManager handle the logout and navigation
      authManager.logout();
    }
  };

  const addTopic = () => {
    if (newTopic.trim() && !topics.includes(newTopic.trim())) {
      setTopics([...topics, newTopic.trim()]);
      setNewTopic('');
    }
  };

  const removeTopic = (topicToRemove) => {
    setTopics(topics.filter(topic => topic !== topicToRemove));
  };

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const addExperience = () => {
    const newExperience = {
      company: '',
      role: '',
      startDate: '',
      endDate: '',
      description: '',
      current: false,
    };
    setExperiences([...experiences, newExperience]);
  };

  const updateExperience = (index, field, value) => {
    const updatedExperiences = [...experiences];
    updatedExperiences[index][field] = value;
    setExperiences(updatedExperiences);
  };

  const removeExperience = (index) => {
    setExperiences(experiences.filter((_, i) => i !== index));
  };

  const addEducation = () => {
    const newEducation = {
      institution: '',
      degree: '',
      fieldOfStudy: '',
      startDate: '',
      endDate: '',
      grade: '',
      current: false,
    };
    setEducation([...education, newEducation]);
  };

  const updateEducation = (index, field, value) => {
    const updatedEducation = [...education];
    updatedEducation[index][field] = value;
    setEducation(updatedEducation);
  };

  const removeEducation = (index) => {
    setEducation(education.filter((_, i) => i !== index));
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showError('Please grant camera roll permissions to upload a profile photo.');
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
          showError('Please choose an image smaller than 5MB.');
          return;
        }

        setPhotoUri(asset.uri);
      }
    } catch (error) {
      showError('Failed to pick image. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      showError('Please complete OTP verification first.');
      return;
    }

    // Validate required fields
    if (!name.trim()) {
      showError('Please enter your full name.');
      return;
    }

    if (!profession.trim()) {
      showError('Please enter your profession.');
      return;
    }

    // Validate profile data
    const profileData = {
      name: name.trim(),
      profession: profession.trim(),
      email: email.trim() || undefined,
      bio: bio.trim() || undefined,
      location: location.trim() || undefined,
      topics: topics.length > 0 ? topics : undefined,
      skills: skills.length > 0 ? skills : undefined,
      experiences: experiences.length > 0 ? experiences.filter(exp =>
        exp.company.trim() && exp.role.trim()
      ) : undefined,
      education: education.length > 0 ? education.filter(edu =>
        edu.institution.trim() && edu.degree.trim()
      ) : undefined,
    };

    setIsLoading(true);
    showLoader();

    try {
      // Complete profile setup using AuthManager
      const result = await authManager.completeProfileSetup(profileData, photoUri);

      if (result.success) {
        showSuccess('Your profile has been created successfully!');

        // The AuthManager should have notified listeners automatically
        // and the AuthNavigator will handle the redirection
        // No manual navigation needed

        // Optional: Add a small delay to ensure the success message is visible
        setTimeout(() => {
          // Auth state should be updated by now, AuthNavigator will handle navigation
        }, 500);
      } else {
        showError(result.message || 'Failed to save profile. Please try again.');
      }
    } catch (error) {
      showError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
      hideLoader();
    }
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
                : 'Complete your profile to continue\nThis information helps others discover you'
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

            {/* Topics Section */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Topics of Interest</Text>
              <View style={styles.addItemContainer}>
                <TextInput
                  style={[styles.input, styles.addItemInput]}
                  placeholder="Add topic (e.g., Machine Learning, React)"
                  value={newTopic}
                  onChangeText={setNewTopic}
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  maxLength={50}
                />
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={addTopic}
                  disabled={!newTopic.trim()}
                >
                  <Icon name="plus" size={20} color="white" />
                </TouchableOpacity>
              </View>
              <View style={styles.tagContainer}>
                {topics.map((topic, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{topic}</Text>
                    <TouchableOpacity onPress={() => removeTopic(topic)}>
                      <Icon name="close" size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>

            {/* Skills Section */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Skills</Text>
              <View style={styles.addItemContainer}>
                <TextInput
                  style={[styles.input, styles.addItemInput]}
                  placeholder="Add skill (e.g., Python, Communication)"
                  value={newSkill}
                  onChangeText={setNewSkill}
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  maxLength={50}
                />
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={addSkill}
                  disabled={!newSkill.trim()}
                >
                  <Icon name="plus" size={20} color="white" />
                </TouchableOpacity>
              </View>
              <View style={styles.tagContainer}>
                {skills.map((skill, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{skill}</Text>
                    <TouchableOpacity onPress={() => removeSkill(skill)}>
                      <Icon name="close" size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>

            {/* Experience Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Work Experience</Text>
                <TouchableOpacity style={styles.addSectionButton} onPress={addExperience}>
                  <Icon name="plus" size={18} color="white" />
                  <Text style={styles.addSectionButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
              {experiences.map((experience, index) => (
                <View key={index} style={styles.experienceCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Experience {index + 1}</Text>
                    <TouchableOpacity onPress={() => removeExperience(index)}>
                      <Icon name="trash-can-outline" size={20} color="#ff6b6b" />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Company/Organization"
                    value={experience.company}
                    onChangeText={(text) => updateExperience(index, 'company', text)}
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    maxLength={100}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Role/Position"
                    value={experience.role}
                    onChangeText={(text) => updateExperience(index, 'role', text)}
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    maxLength={100}
                  />
                  <View style={styles.dateContainer}>
                    <TextInput
                      style={[styles.input, styles.dateInput]}
                      placeholder="Start Date (MM/YYYY)"
                      value={experience.startDate}
                      onChangeText={(text) => updateExperience(index, 'startDate', text)}
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      maxLength={7}
                    />
                    <TextInput
                      style={[styles.input, styles.dateInput]}
                      placeholder="End Date (MM/YYYY)"
                      value={experience.endDate}
                      onChangeText={(text) => updateExperience(index, 'endDate', text)}
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      maxLength={7}
                      editable={!experience.current}
                    />
                  </View>
                  <View style={styles.checkboxContainer}>
                    <TouchableOpacity
                      style={styles.checkbox}
                      onPress={() => updateExperience(index, 'current', !experience.current)}
                    >
                      <Icon
                        name={experience.current ? "checkbox-marked" : "checkbox-blank-outline"}
                        size={20}
                        color="white"
                      />
                    </TouchableOpacity>
                    <Text style={styles.checkboxText}>Currently working here</Text>
                  </View>
                  <TextInput
                    style={[styles.input, styles.bioInput]}
                    placeholder="Description (optional)"
                    value={experience.description}
                    onChangeText={(text) => updateExperience(index, 'description', text)}
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    maxLength={500}
                  />
                </View>
              ))}
            </View>

            {/* Education Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Education</Text>
                <TouchableOpacity style={styles.addSectionButton} onPress={addEducation}>
                  <Icon name="plus" size={18} color="white" />
                  <Text style={styles.addSectionButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
              {education.map((edu, index) => (
                <View key={index} style={styles.experienceCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Education {index + 1}</Text>
                    <TouchableOpacity onPress={() => removeEducation(index)}>
                      <Icon name="trash-can-outline" size={20} color="#ff6b6b" />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Institution/University"
                    value={edu.institution}
                    onChangeText={(text) => updateEducation(index, 'institution', text)}
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    maxLength={100}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Degree (e.g., Bachelor of Science)"
                    value={edu.degree}
                    onChangeText={(text) => updateEducation(index, 'degree', text)}
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    maxLength={100}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Field of Study (e.g., Computer Science)"
                    value={edu.fieldOfStudy}
                    onChangeText={(text) => updateEducation(index, 'fieldOfStudy', text)}
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    maxLength={100}
                  />
                  <View style={styles.dateContainer}>
                    <TextInput
                      style={[styles.input, styles.dateInput]}
                      placeholder="Start Date (MM/YYYY)"
                      value={edu.startDate}
                      onChangeText={(text) => updateEducation(index, 'startDate', text)}
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      maxLength={7}
                    />
                    <TextInput
                      style={[styles.input, styles.dateInput]}
                      placeholder="End Date (MM/YYYY)"
                      value={edu.endDate}
                      onChangeText={(text) => updateEducation(index, 'endDate', text)}
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      maxLength={7}
                      editable={!edu.current}
                    />
                  </View>
                  <View style={styles.checkboxContainer}>
                    <TouchableOpacity
                      style={styles.checkbox}
                      onPress={() => updateEducation(index, 'current', !edu.current)}
                    >
                      <Icon
                        name={edu.current ? "checkbox-marked" : "checkbox-blank-outline"}
                        size={20}
                        color="white"
                      />
                    </TouchableOpacity>
                    <Text style={styles.checkboxText}>Currently studying here</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Grade/CGPA (optional)"
                    value={edu.grade}
                    onChangeText={(text) => updateEducation(index, 'grade', text)}
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    maxLength={20}
                  />
                </View>
              ))}
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

            <Text style={styles.mandatoryText}>
              Profile completion is required to continue
            </Text>
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
    marginBottom: 20,
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
  mandatoryText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 20,
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
  sectionContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addItemContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  addItemInput: {
    flex: 1,
    marginRight: 10,
    marginBottom: 0,
  },
  addButton: {
    backgroundColor: '#8a2be2',
    borderRadius: 8,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addSectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(138, 43, 226, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8a2be2',
  },
  addSectionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(138, 43, 226, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(138, 43, 226, 0.5)',
  },
  tagText: {
    color: 'white',
    fontSize: 14,
    marginRight: 6,
  },
  experienceCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateInput: {
    flex: 1,
    marginRight: 8,
    marginBottom: 0,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    marginRight: 8,
  },
  checkboxText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
});

export default ProfileSetupScreen;
