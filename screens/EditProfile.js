// screens/EditProfileScreen.js
import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, Image, TouchableOpacity, Text, ScrollView, KeyboardAvoidingView, Platform, Modal, FlatList } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Container from '../components/Container';
import Button from '../components/Button';
import colors from '../config/colors';
import authManager from '../services/AuthManager';
import profileApi from '../api/ProfileApi';
import { useLoader } from '../context/LoaderContext';
import { useNotification } from '../contexts/NotificationContext';

const EditProfileScreen = ({ navigation }) => {
  const [photoUri, setPhotoUri] = useState(null);
  const [name, setName] = useState('');
  const [profession, setProfession] = useState('');
  const [email, setEmail] = useState('');
  const [topics, setTopics] = useState([]);
  const [skills, setSkills] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [education, setEducation] = useState([]);
  const [loading, setLoading] = useState(true);

  // Input states for adding new items
  const [newTopic, setNewTopic] = useState('');
  const [newSkill, setNewSkill] = useState('');

  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentDateField, setCurrentDateField] = useState(null);
  const [currentItemIndex, setCurrentItemIndex] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const { showLoader, hideLoader } = useLoader();
  const { showError, showSuccess } = useNotification();

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      showError('Please grant camera roll permissions');
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
      startDate: null,
      endDate: null,
      description: '',
      isCurrentRole: false,
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
      startDate: null,
      endDate: null,
      grade: '',
      isCurrent: false,
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

  // Date utility functions
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  const formatDateForAPI = (year, month) => {
    if (!year || !month) return null;
    const formattedMonth = String(month).padStart(2, '0');
    return `${year}-${formattedMonth}-01`;
  };

  const openDatePicker = (type, itemIndex, field) => {
    // Get current date from the field if it exists
    let currentDate = null;
    if (type === 'experience') {
      currentDate = experiences[itemIndex]?.[field];
    } else if (type === 'education') {
      currentDate = education[itemIndex]?.[field];
    }

    if (currentDate) {
      const date = new Date(currentDate);
      setSelectedYear(date.getFullYear());
      setSelectedMonth(date.getMonth() + 1);
    } else {
      setSelectedYear(new Date().getFullYear());
      setSelectedMonth(new Date().getMonth() + 1);
    }

    setCurrentDateField(`${type}_${itemIndex}_${field}`);
    setCurrentItemIndex(itemIndex);
    setShowDatePicker(true);
  };

  const handleDateConfirm = () => {
    if (currentDateField) {
      const [type, itemIndex, field] = currentDateField.split('_');
      const formattedDate = formatDateForAPI(selectedYear, selectedMonth);

      if (type === 'experience') {
        updateExperience(parseInt(itemIndex), field, formattedDate);
      } else if (type === 'education') {
        updateEducation(parseInt(itemIndex), field, formattedDate);
      }
    }

    setShowDatePicker(false);
    setCurrentDateField(null);
    setCurrentItemIndex(null);
  };

  const handleDateCancel = () => {
    setShowDatePicker(false);
    setShowMonthPicker(false);
    setShowYearPicker(false);
    setCurrentDateField(null);
    setCurrentItemIndex(null);
  };

  // Generate years and months for picker
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 50 }, (_, i) => currentYear - i);
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

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
        setProfession(currentUser.profession || currentUser.designation || '');
        setEmail(currentUser.email || '');
        setPhotoUri(currentUser.profilePic || null);
        setTopics(currentUser.topics || []);
        setSkills(currentUser.skills || []);
        setExperiences(currentUser.experiences || []);
        setEducation(currentUser.education || []);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      showError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Validate required fields
      if (!name.trim()) {
        showError('Name is required');
        return;
      }

      if (!profession.trim()) {
        showError('Profession is required');
        return;
      }

      showLoader();

      // Prepare profile data
      const profileData = {
        name: name.trim(),
        profession: profession.trim(),
        email: email.trim(),
        topics: topics.length > 0 ? topics : undefined,
        skills: skills.length > 0 ? skills : undefined,
        experiences: experiences.length > 0 ? experiences.filter(exp =>
          exp.company.trim() && exp.role.trim()
        ) : undefined,
        education: education.length > 0 ? education.filter(edu =>
          edu.institution.trim() && edu.degree.trim()
        ) : undefined,
      };

      // Validate profile data
      const validation = profileApi.validateProfileData(profileData);
      if (!validation.isValid) {
        showError(validation.errors.join('\n'));
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
        
        showSuccess(result.message || 'Profile updated successfully');
        setTimeout(() => navigation.goBack(), 1500);
      } else {
        showError(result.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      showError('Failed to save changes. Please try again.');
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        <TouchableOpacity onPress={pickImage} style={styles.photoContainer}>
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


        {/* Topics Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Topics of Interest</Text>
          <View style={styles.addItemContainer}>
            <TextInput
              style={[styles.input, styles.addItemInput]}
              placeholder="Add topic"
              value={newTopic}
              onChangeText={setNewTopic}
              placeholderTextColor={colors.textSecondary}
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
              placeholder="Add skill"
              value={newSkill}
              onChangeText={setNewSkill}
              placeholderTextColor={colors.textSecondary}
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
                placeholderTextColor={colors.textSecondary}
                maxLength={100}
              />
              <TextInput
                style={styles.input}
                placeholder="Role/Position"
                value={experience.role}
                onChangeText={(text) => updateExperience(index, 'role', text)}
                placeholderTextColor={colors.textSecondary}
                maxLength={100}
              />
              <View style={styles.dateContainer}>
                <TouchableOpacity
                  style={[styles.input, styles.dateInput, styles.datePickerButton]}
                  onPress={() => openDatePicker('experience', index, 'startDate')}
                >
                  <Text style={styles.datePickerText}>
                    {formatDateForDisplay(experience.startDate) || 'Start Date'}
                  </Text>
                  <Icon name="calendar" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.input,
                    styles.dateInput,
                    styles.datePickerButton,
                    experience.isCurrentRole && styles.disabledInput
                  ]}
                  onPress={() => !experience.isCurrentRole && openDatePicker('experience', index, 'endDate')}
                  disabled={experience.isCurrentRole}
                >
                  <Text style={[
                    styles.datePickerText,
                    experience.isCurrentRole && styles.disabledText
                  ]}>
                    {experience.isCurrentRole ? 'Present' : (formatDateForDisplay(experience.endDate) || 'End Date')}
                  </Text>
                  <Icon
                    name="calendar"
                    size={20}
                    color={experience.isCurrentRole ? colors.textMuted : colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => updateExperience(index, 'isCurrentRole', !experience.isCurrentRole)}
                >
                  <Icon
                    name={experience.isCurrentRole ? "checkbox-marked" : "checkbox-blank-outline"}
                    size={20}
                    color={colors.textPrimary}
                  />
                </TouchableOpacity>
                <Text style={styles.checkboxText}>Currently working here</Text>
              </View>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description (optional)"
                value={experience.description}
                onChangeText={(text) => updateExperience(index, 'description', text)}
                placeholderTextColor={colors.textSecondary}
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
                placeholderTextColor={colors.textSecondary}
                maxLength={100}
              />
              <TextInput
                style={styles.input}
                placeholder="Degree"
                value={edu.degree}
                onChangeText={(text) => updateEducation(index, 'degree', text)}
                placeholderTextColor={colors.textSecondary}
                maxLength={100}
              />
              <TextInput
                style={styles.input}
                placeholder="Field of Study"
                value={edu.fieldOfStudy}
                onChangeText={(text) => updateEducation(index, 'fieldOfStudy', text)}
                placeholderTextColor={colors.textSecondary}
                maxLength={100}
              />
              <View style={styles.dateContainer}>
                <TouchableOpacity
                  style={[styles.input, styles.dateInput, styles.datePickerButton]}
                  onPress={() => openDatePicker('education', index, 'startDate')}
                >
                  <Text style={styles.datePickerText}>
                    {formatDateForDisplay(edu.startDate) || 'Start Date'}
                  </Text>
                  <Icon name="calendar" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.input,
                    styles.dateInput,
                    styles.datePickerButton,
                    edu.isCurrent && styles.disabledInput
                  ]}
                  onPress={() => !edu.isCurrent && openDatePicker('education', index, 'endDate')}
                  disabled={edu.isCurrent}
                >
                  <Text style={[
                    styles.datePickerText,
                    edu.isCurrent && styles.disabledText
                  ]}>
                    {edu.isCurrent ? 'Present' : (formatDateForDisplay(edu.endDate) || 'End Date')}
                  </Text>
                  <Icon
                    name="calendar"
                    size={20}
                    color={edu.isCurrent ? colors.textMuted : colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => updateEducation(index, 'isCurrent', !edu.isCurrent)}
                >
                  <Icon
                    name={edu.isCurrent ? "checkbox-marked" : "checkbox-blank-outline"}
                    size={20}
                    color={colors.textPrimary}
                  />
                </TouchableOpacity>
                <Text style={styles.checkboxText}>Currently studying here</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Grade/CGPA (optional)"
                value={edu.grade}
                onChangeText={(text) => updateEducation(index, 'grade', text)}
                placeholderTextColor={colors.textSecondary}
                maxLength={20}
              />
            </View>
          ))}
        </View>

        <Button title="Save Changes" onPress={handleSave} />

        {/* Custom Date Picker Modal */}
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={handleDateCancel}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerModal}>
              <View style={styles.datePickerHeader}>
                <Text style={styles.datePickerTitle}>Select Date</Text>
              </View>

              <View style={styles.datePickerContent}>
                <View style={styles.pickerContainer}>
                  <View style={styles.pickerColumn}>
                    <Text style={styles.pickerLabel}>Month</Text>
                    <TouchableOpacity
                      style={styles.dateSelector}
                      onPress={() => setShowMonthPicker(!showMonthPicker)}
                    >
                      <Text style={styles.dateSelectorText}>
                        {months.find(m => m.value === selectedMonth)?.label || 'Select Month'}
                      </Text>
                      <Icon name="chevron-down" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                    {showMonthPicker && (
                      <View style={styles.dropdownContainer}>
                        <FlatList
                          data={months}
                          keyExtractor={(item) => item.value.toString()}
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={[
                                styles.dropdownItem,
                                item.value === selectedMonth && styles.selectedDropdownItem
                              ]}
                              onPress={() => {
                                setSelectedMonth(item.value);
                                setShowMonthPicker(false);
                              }}
                            >
                              <Text style={[
                                styles.dropdownItemText,
                                item.value === selectedMonth && styles.selectedDropdownItemText
                              ]}>
                                {item.label}
                              </Text>
                            </TouchableOpacity>
                          )}
                          style={styles.dropdown}
                          showsVerticalScrollIndicator={false}
                        />
                      </View>
                    )}
                  </View>

                  <View style={styles.pickerColumn}>
                    <Text style={styles.pickerLabel}>Year</Text>
                    <TouchableOpacity
                      style={styles.dateSelector}
                      onPress={() => setShowYearPicker(!showYearPicker)}
                    >
                      <Text style={styles.dateSelectorText}>
                        {selectedYear}
                      </Text>
                      <Icon name="chevron-down" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                    {showYearPicker && (
                      <View style={styles.dropdownContainer}>
                        <FlatList
                          data={years}
                          keyExtractor={(item) => item.toString()}
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={[
                                styles.dropdownItem,
                                item === selectedYear && styles.selectedDropdownItem
                              ]}
                              onPress={() => {
                                setSelectedYear(item);
                                setShowYearPicker(false);
                              }}
                            >
                              <Text style={[
                                styles.dropdownItemText,
                                item === selectedYear && styles.selectedDropdownItemText
                              ]}>
                                {item}
                              </Text>
                            </TouchableOpacity>
                          )}
                          style={styles.dropdown}
                          showsVerticalScrollIndicator={false}
                        />
                      </View>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.datePickerActions}>
                <TouchableOpacity
                  style={[styles.datePickerButton, styles.cancelButton]}
                  onPress={handleDateCancel}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.datePickerButton, styles.confirmButton]}
                  onPress={handleDateConfirm}
                >
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
      </KeyboardAvoidingView>
    </Container>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  photoContainer: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: colors.secondary,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  avatarPlaceholderText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.border,
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
  sectionContainer: {
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
    backgroundColor: colors.button,
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
    borderColor: colors.button,
  },
  addSectionButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.button,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: 'white',
    fontSize: 14,
    marginRight: 6,
  },
  experienceCard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
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
    color: colors.textPrimary,
    fontSize: 14,
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  datePickerText: {
    color: colors.textPrimary,
    fontSize: 16,
    flex: 1,
  },
  disabledInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    opacity: 0.6,
  },
  disabledText: {
    color: colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerModal: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.border,
  },
  datePickerHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
    textAlign: 'center',
  },
  datePickerContent: {
    padding: 20,
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pickerColumn: {
    flex: 1,
    marginHorizontal: 10,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  dateSelector: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateSelectorText: {
    color: colors.white,
    fontSize: 16,
    flex: 1,
  },
  dropdownContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: colors.backgroundElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 200,
  },
  dropdown: {
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemText: {
    color: colors.white,
    fontSize: 16,
    textAlign: 'center',
  },
  selectedDropdownItem: {
    backgroundColor: colors.button,
  },
  selectedDropdownItemText: {
    color: colors.white,
    fontWeight: '600',
  },
  datePickerActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  datePickerButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  cancelButton: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  confirmButton: {
    backgroundColor: colors.button,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});

export default EditProfileScreen;
