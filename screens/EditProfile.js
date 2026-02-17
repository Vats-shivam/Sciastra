// screens/EditProfileScreen.js
import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, Image, TouchableOpacity, Text, ScrollView, KeyboardAvoidingView, Platform, Modal, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Button from '../components/Button';
import Header from '../components/Header';
import colors from '../config/colors';
import authManager from '../services/AuthManager';
import profileApi from '../api/ProfileApi';
import { useLoader } from '../context/LoaderContext';
import { ProfileSkeleton } from '../components/skeletons';
import { useNotification } from '../contexts/NotificationContext';
import useScreenApiLogger from '../hooks/useScreenApiLogger';

const EditProfileScreen = ({ navigation }) => {
  const [photoUri, setPhotoUri] = useState(null);
  const [name, setName] = useState('');
  const [profession, setProfession] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
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

  const { showLoader, hideLoader } = useLoader();
  const { showError, showSuccess } = useNotification();

  useScreenApiLogger('EditProfile');

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

  // Removed removeExperience - no API endpoint to delete individual experiences
  // Users can remove by clearing fields and saving, or backend handles it via full profile update

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

  // Removed removeEducation - no API endpoint to delete individual education entries
  // Users can remove by clearing fields and saving, or backend handles it via full profile update

  // Date utility functions
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    
    // Check if it's already in MM/YYYY format
    if (dateString.includes('/')) {
      const [month, year] = dateString.split('/');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[parseInt(month) - 1]} ${year}`;
    }
    
    // Otherwise try to parse as a date
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  const formatDateForAPI = (year, month) => {
    if (!year || !month) return null;
    const formattedMonth = String(month).padStart(2, '0');
    return `${formattedMonth}/${year}`;
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
      // Check if it's in MM/YYYY format
      if (currentDate.includes('/')) {
        const [month, year] = currentDate.split('/');
        setSelectedYear(parseInt(year));
        setSelectedMonth(parseInt(month));
      } else {
        // Try parsing as a date
        const date = new Date(currentDate);
        setSelectedYear(date.getFullYear());
        setSelectedMonth(date.getMonth() + 1);
      }
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
      const index = parseInt(itemIndex);

      // Validate date range
      if (type === 'experience') {
        const experience = experiences[index];
        if (field === 'startDate' && experience.endDate && !experience.isCurrentRole) {
          // Check if start date is after end date
          const startDate = new Date(selectedYear, selectedMonth - 1);
          const [endMonth, endYear] = experience.endDate.split('/');
          const endDate = new Date(parseInt(endYear), parseInt(endMonth) - 1);
          
          if (startDate > endDate) {
            showError('Start date cannot be after end date');
            return;
          }
        } else if (field === 'endDate' && experience.startDate) {
          // Check if end date is before start date
          const [startMonth, startYear] = experience.startDate.split('/');
          const startDate = new Date(parseInt(startYear), parseInt(startMonth) - 1);
          const endDate = new Date(selectedYear, selectedMonth - 1);
          
          if (endDate < startDate) {
            showError('End date cannot be before start date');
            return;
          }
        }
        updateExperience(index, field, formattedDate);
      } else if (type === 'education') {
        const edu = education[index];
        if (field === 'startDate' && edu.endDate && !edu.isCurrent) {
          // Check if start date is after end date
          const startDate = new Date(selectedYear, selectedMonth - 1);
          const [endMonth, endYear] = edu.endDate.split('/');
          const endDate = new Date(parseInt(endYear), parseInt(endMonth) - 1);
          
          if (startDate > endDate) {
            showError('Start date cannot be after end date');
            return;
          }
        } else if (field === 'endDate' && edu.startDate) {
          // Check if end date is before start date
          const [startMonth, startYear] = edu.startDate.split('/');
          const startDate = new Date(parseInt(startYear), parseInt(startMonth) - 1);
          const endDate = new Date(selectedYear, selectedMonth - 1);
          
          if (endDate < startDate) {
            showError('End date cannot be before start date');
            return;
          }
        }
        updateEducation(index, field, formattedDate);
      }
    }

    setShowDatePicker(false);
    setCurrentDateField(null);
    setCurrentItemIndex(null);
  };

  const handleDateCancel = () => {
    setShowDatePicker(false);
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
        setBio(currentUser.bio || '');
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
        bio: bio.trim() || undefined,
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
      <View style={styles.screenContainer}>
        <Header title="Edit Profile" showTitle={true} showBackButton={true} onBackPress={() => navigation.goBack()} />
        <ProfileSkeleton showPosts={false} />
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <Header 
        title="Edit Profile" 
        showTitle={true}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
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

        {/* Bio Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionTitleContainer}>
            <Icon name="information-outline" size={20} color={colors.button} />
            <Text style={styles.sectionTitle}>About</Text>
          </View>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell others about yourself..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={[styles.charCount, { color: 'white' }]}>{bio.length}/500</Text>
        </View>

        {/* Topics Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionTitleContainer}>
            <Icon name="tag-outline" size={20} color={colors.button} />
            <Text style={styles.sectionTitle}>Topics of Interest</Text>
          </View>
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
          <View style={styles.sectionTitleContainer}>
            <Icon name="lightbulb-outline" size={20} color={colors.button} />
            <Text style={styles.sectionTitle}>Skills</Text>
          </View>
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
            <View style={styles.sectionTitleContainer}>
              <Icon name="briefcase-outline" size={20} color={colors.button} />
              <Text style={styles.sectionTitle}>Work Experience</Text>
            </View>
            <TouchableOpacity style={styles.addSectionButton} onPress={addExperience}>
              <Icon name="plus" size={18} color="white" />
              <Text style={styles.addSectionButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          {experiences.map((experience, index) => (
            <View key={index} style={styles.experienceCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Experience {index + 1}</Text>
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
            <View style={styles.sectionTitleContainer}>
              <Icon name="school-outline" size={20} color={colors.button} />
              <Text style={styles.sectionTitle}>Education</Text>
            </View>
            <TouchableOpacity style={styles.addSectionButton} onPress={addEducation}>
              <Icon name="plus" size={18} color="white" />
              <Text style={styles.addSectionButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          {education.map((edu, index) => (
            <View key={index} style={styles.experienceCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Education {index + 1}</Text>
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

        {/* Custom Date Picker Modal */}
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={handleDateCancel}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerModal}>
              <View style={styles.datePickerHeader}>
                <Text style={styles.datePickerTitle}>Select Date</Text>
                <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={handleDateCancel}
                >
                  <Icon name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>

              <View style={styles.datePickerContent}>
                {/* Month Picker Section */}
                <View style={styles.pickerSection}>
                  <Text style={styles.pickerSectionLabel}>Month</Text>
                  <ScrollView 
                    style={styles.pickerScrollView}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.pickerScrollContent}
                  >
                    {months.map((month) => (
                      <TouchableOpacity
                        key={month.value}
                        style={[
                          styles.pickerItem,
                          month.value === selectedMonth && styles.pickerItemSelected
                        ]}
                        onPress={() => setSelectedMonth(month.value)}
                      >
                        <Text style={[
                          styles.pickerItemText,
                          month.value === selectedMonth && styles.pickerItemTextSelected
                        ]}>
                          {month.label}
                        </Text>
                        {month.value === selectedMonth && (
                          <Icon name="check" size={20} color={colors.button} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Year Picker Section */}
                <View style={styles.pickerSection}>
                  <Text style={styles.pickerSectionLabel}>Year</Text>
                  <ScrollView 
                    style={styles.pickerScrollView}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.pickerScrollContent}
                  >
                    {years.map((year) => (
                      <TouchableOpacity
                        key={year}
                        style={[
                          styles.pickerItem,
                          year === selectedYear && styles.pickerItemSelected
                        ]}
                        onPress={() => setSelectedYear(year)}
                      >
                        <Text style={[
                          styles.pickerItemText,
                          year === selectedYear && styles.pickerItemTextSelected
                        ]}>
                          {year}
                        </Text>
                        {year === selectedYear && (
                          <Icon name="check" size={20} color={colors.button} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.datePickerActions}>
                <TouchableOpacity
                  style={[styles.dateActionButton, styles.cancelButton]}
                  onPress={handleDateCancel}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dateActionButton, styles.confirmButton]}
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

      {/* Floating Save Button */}
      <View style={styles.floatingButtonContainer}>
        <Button title="Save Changes" onPress={handleSave} style={styles.floatingSaveButton} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100, // Extra padding for floating button
  },
  photoContainer: {
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 24,
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    borderWidth: 4,
    borderColor: colors.button,
    shadowColor: colors.button,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: colors.backgroundElevated,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    borderWidth: 3,
    borderColor: colors.border,
  },
  avatarPlaceholderText: {
    color: colors.textPrimary,
    fontFamily: 'Gilroy-SemiBold',
    fontSize: 14,
  },
  input: {
    backgroundColor: colors.backgroundElevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    color: colors.textPrimary,
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    marginLeft: 8,
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
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: 'Gilroy-Medium',
    marginRight: 8,
  },
  experienceCard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
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
    fontFamily: 'Gilroy-Regular',
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 12,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingSaveButton: {
    marginHorizontal: 0,
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
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  datePickerModal: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 24,
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    borderWidth: 2,
    borderColor: colors.button,
    overflow: 'hidden',
    shadowColor: colors.button,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(138, 43, 226, 0.3)',
    backgroundColor: 'rgba(138, 43, 226, 0.15)',
  },
  modalCloseButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  datePickerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
  },
  datePickerContent: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  pickerSection: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(138, 43, 226, 0.2)',
    overflow: 'hidden',
  },
  pickerSectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(138, 43, 226, 0.2)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(138, 43, 226, 0.3)',
  },
  pickerScrollView: {
    maxHeight: 280,
  },
  pickerScrollContent: {
    padding: 8,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    marginVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pickerItemSelected: {
    backgroundColor: 'rgba(138, 43, 226, 0.25)',
    borderColor: colors.button,
    borderWidth: 2,
  },
  pickerItemText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  pickerItemTextSelected: {
    color: colors.white,
    fontWeight: '700',
  },
  datePickerActions: {
    flexDirection: 'row',
    borderTopWidth: 2,
    borderTopColor: 'rgba(138, 43, 226, 0.3)',
  },
  dateActionButton: {
    flex: 1,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(138, 43, 226, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  confirmButton: {
    backgroundColor: colors.button,
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  confirmButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.white,
  },
});

export default EditProfileScreen;
