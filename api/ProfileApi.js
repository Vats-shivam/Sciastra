import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { 
  API_ENDPOINTS, 
  STORAGE_KEYS, 
  REQUEST_CONFIG, 
  ERROR_MESSAGES,
  getApiBaseUrl,
  getCommonHeaders 
} from '../config/apiConfig';
import authApi from './AuthApi';
import apiLogger from '../services/ApiLogger';

class ProfileApiService {
  constructor() {
    this.baseUrl = getApiBaseUrl('profile');
  }

  // Generic API request method with authentication
  async makeRequest(url, options = {}) {
    const maxRetries = REQUEST_CONFIG.RETRY_ATTEMPTS;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        // Ensure we have a valid access token
        const accessToken = authApi.getAccessToken();
        if (!accessToken && !options.skipAuth) {
          throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
        }

        const config = {
          headers: getCommonHeaders(!options.skipAuth, accessToken),
          ...options,
        };

        const method = (config.method || 'GET').toUpperCase();
        apiLogger.logApiCall(url, method);

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_CONFIG.TIMEOUT);
        config.signal = controller.signal;

        console.log('Profile API: Making fetch request to:', url);
        console.log('Profile API: Request config:', JSON.stringify({
          method: config.method,
          headers: config.headers,
          body: config.body
        }, null, 2));

        const response = await fetch(url, config);
        clearTimeout(timeoutId);

        console.log('Profile API: Raw response status:', response.status);
        console.log('Profile API: Raw response headers:', response.headers.get('content-type'));

        const data = await response.json();
        console.log('Profile API: Parsed response data:', JSON.stringify(data, null, 2));

        apiLogger.logApiResponse(
          url,
          method,
          response.status,
          data,
          response.ok ? null : data?.message || 'Request failed'
        );

        // Handle token expiration
        if (response.status === 401 && !options.skipRefresh) {
          const refreshed = await authApi.refreshAccessToken();
          if (refreshed) {
            // Retry the original request with new token
            return this.makeRequest(url, { ...options, skipRefresh: true });
          } else {
            // Refresh failed, clear tokens and throw error
            await authApi.clearTokens();
            throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
          }
        }

        if (!response.ok) {
          const errorMessage = this.getErrorMessage(response.status, data.message);
          throw new Error(errorMessage);
        }

        return data;
      } catch (error) {
        attempt++;
        
        if (error.name === 'AbortError') {
          throw new Error(ERROR_MESSAGES.TIMEOUT_ERROR);
        }
        
        if (attempt >= maxRetries) {
          console.error('Profile API Request Error:', error);
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, REQUEST_CONFIG.RETRY_DELAY));
      }
    }
  }

  // Get appropriate error message based on status code
  getErrorMessage(status, apiMessage) {
    switch (status) {
      case 400:
        return apiMessage || 'Invalid profile data. Please check your inputs.';
      case 401:
        return ERROR_MESSAGES.UNAUTHORIZED;
      case 404:
        return 'Profile not found.';
      case 413:
        return 'Image file is too large. Please choose a smaller image.';
      case 429:
        return 'Too many requests. Please wait and try again.';
      case 500:
      case 502:
      case 503:
        return ERROR_MESSAGES.SERVER_ERROR;
      default:
        return apiMessage || ERROR_MESSAGES.GENERIC_ERROR;
    }
  }

  // Get presigned URL for image upload
  async getUploadUrl(fileName, fileType) {
    try {
      const response = await this.makeRequest(`${this.baseUrl}${API_ENDPOINTS.PROFILE.UPLOAD_URL}`, {
        method: 'POST',
        body: JSON.stringify({
          fileName,
          fileType,
        }),
      });

      if (response.success && response.data) {
        return {
          success: true,
          uploadUrl: response.data.url,
          imageUrl: response.data.imageUrl,
        };
      } else {
        throw new Error(response.message || 'Failed to get upload URL');
      }
    } catch (error) {
      console.error('Get Upload URL Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to prepare image upload. Please try again.',
      };
    }
  }

  // Upload image to presigned URL
  async uploadImage(fileName, uploadUrl, imageUri, fileType) {
  try {
    console.log('Uploading image to URL:', uploadUrl);
    console.log('Image URI:', imageUri);

    // Prefer Expo FileSystem uploader for reliability on Android/iOS.
    // This performs a raw PUT (binary) upload (not multipart), which is required for S3 presigned PUT URLs.
    try {
      const uploadResult = await FileSystem.uploadAsync(uploadUrl, imageUri, {
        httpMethod: 'PUT',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
          'Content-Type': fileType, // Must match the type used to generate presigned URL
        },
      });

      if (uploadResult.status >= 200 && uploadResult.status < 300) {
        return { success: true };
      }

      // S3 returns useful XML error details in the body (e.g. AccessDenied, SignatureDoesNotMatch).
      const errorBodyPreview = typeof uploadResult.body === 'string'
        ? uploadResult.body.slice(0, 1000)
        : '';
      console.error('S3 Upload Response Status:', uploadResult.status);
      console.error('S3 Upload Response Body (preview):', errorBodyPreview);
      throw new Error(`Failed to upload image. Status: ${uploadResult.status}`);
    } catch (fsError) {
      // Fallback for environments where FileSystem upload isn't supported (e.g. web),
      // or if the underlying upload implementation fails unexpectedly.
      console.warn('FileSystem upload failed, falling back to fetch upload:', fsError?.message || fsError);

      const fileBlob = await fetch(imageUri).then(res => res.blob());
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: fileBlob,
        headers: {
          'Content-Type': fileType,
        },
      });

      if (response.ok) {
        return { success: true };
      }

      const s3ErrorText = await response.text().catch(() => '');
      console.error('S3 Upload Response Status:', response.status);
      console.error('S3 Upload Response Body (preview):', s3ErrorText.slice(0, 1000));
      throw new Error(`Failed to upload image. Status: ${response.status}`);
    }
  } catch (error) {
    console.error('Upload Image Error:', error.message);
    return {
      success: false,
      message: error.message || 'Failed to upload image. Please try again.',
    };
  }
}


  // Convert date from ISO format or other formats to MM/YYYY format
  convertDateToMonthYear(dateValue) {
    if (!dateValue) return null;
    
    // If already in MM/YYYY format, return as is
    if (typeof dateValue === 'string' && dateValue.match(/^\d{2}\/\d{4}$/)) {
      return dateValue;
    }
    
    // Try to parse as ISO date or other date formats
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date format:', dateValue);
        return null;
      }
      
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${year}`;
    } catch (error) {
      console.warn('Error converting date:', dateValue, error);
      return null;
    }
  }

  // Convert date fields in experiences and education to MM/YYYY format
  // Map isCurrentRole/isCurrent to backend field "current"
  formatProfileDates(profileData) {
    const formattedData = { ...profileData };
    
    // Format experiences dates
    if (formattedData.experiences && Array.isArray(formattedData.experiences)) {
      formattedData.experiences = formattedData.experiences.map(exp => ({
        ...exp,
        current: exp.current ?? exp.isCurrentRole ?? false,
        startDate: this.convertDateToMonthYear(exp.startDate),
        endDate: (exp.current ?? exp.isCurrentRole) ? null : this.convertDateToMonthYear(exp.endDate),
      }));
    }
    
    // Format education dates
    if (formattedData.education && Array.isArray(formattedData.education)) {
      formattedData.education = formattedData.education.map(edu => ({
        ...edu,
        current: edu.current ?? edu.isCurrent ?? false,
        startDate: this.convertDateToMonthYear(edu.startDate),
        endDate: (edu.current ?? edu.isCurrent) ? null : this.convertDateToMonthYear(edu.endDate),
      }));
    }
    
    return formattedData;
  }

  // Create or update user profile
  async createOrUpdateProfile(profileData) {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      // Format dates before processing
      const formattedProfileData = this.formatProfileDates(profileData);

      // Check if we're in bypass mode (for demo)
      if (userId === 'bypass_user_1234567890') {
        console.log('Using bypass mode for profile creation');
        
        // Create mock profile data for bypass mode
        const mockProfileData = {
          userId: userId,
          name: formattedProfileData.name,
          profession: formattedProfileData.profession,
          email: formattedProfileData.email,
          bio: formattedProfileData.bio,
          location: formattedProfileData.location,
          profilePic: formattedProfileData.profileImageUrl || null,
          topics: formattedProfileData.topics || [],
          skills: formattedProfileData.skills || [],
          experiences: formattedProfileData.experiences || [],
          education: formattedProfileData.education || [],
          contactSyncStatus: 'PENDING',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Store locally for bypass mode
        await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(mockProfileData));
        
        return {
          success: true,
          message: 'Profile saved successfully (demo mode)',
          data: mockProfileData,
        };
      }

      // Prepare profile data according to backend API structure
      const payload = {
        name: formattedProfileData.name,
        profession: formattedProfileData.profession,
        email: formattedProfileData.email,
        bio: formattedProfileData.bio,
        location: formattedProfileData.location,
        profilePic: formattedProfileData.profileImageUrl || null,
        topics: formattedProfileData.topics || [],
        skills: formattedProfileData.skills || [],
        experiences: formattedProfileData.experiences || [],
        education: formattedProfileData.education || [],
      };

      const url = `${this.baseUrl}${API_ENDPOINTS.PROFILE.CREATE_UPDATE}`;
      console.log('Profile API: Making request to URL:', url);
      console.log('Profile API: Request payload:', JSON.stringify(payload, null, 2));
      console.log('Profile API: User ID:', userId);

      const response = await this.makeRequest(url, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      console.log('Profile API: Response received:', JSON.stringify(response, null, 2));

      if (response.success) {
        // Store profile data locally for quick access
        await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(response.data));
        
        return {
          success: true,
          message: response.message || 'Profile saved successfully',
          data: response.data,
        };
      } else {
        throw new Error(response.message || 'Failed to save profile');
      }
    } catch (error) {
      console.error('Create/Update Profile Error:', error);
      
      // If it's a timeout or network error in demo mode, use bypass
      if (error.message.includes('timeout') || error.message.includes('Network')) {
        console.log('Network error detected, falling back to demo mode');
        
        // Format dates before fallback
        const formattedProfileData = this.formatProfileDates(profileData);
        
        const mockProfileData = {
          userId: authApi.getCurrentUserId(),
          name: formattedProfileData.name,
          profession: formattedProfileData.profession,
          email: formattedProfileData.email,
          bio: formattedProfileData.bio,
          location: formattedProfileData.location,
          profilePic: formattedProfileData.profileImageUrl || null,
          topics: formattedProfileData.topics || [],
          skills: formattedProfileData.skills || [],
          experiences: formattedProfileData.experiences || [],
          education: formattedProfileData.education || [],
          contactSyncStatus: 'PENDING',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(mockProfileData));
        
        return {
          success: true,
          message: 'Profile saved locally (offline mode)',
          data: mockProfileData,
        };
      }
      
      return {
        success: false,
        message: error.message || 'Failed to save profile. Please try again.',
      };
    }
  }

  // Get user profile by ID
  async getProfile(userId = null) {
    try {
      const targetUserId = userId || authApi.getCurrentUserId();
      if (!targetUserId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      // Check for bypass mode or cached profile first
      if (targetUserId === 'bypass_user_1234567890') {
        const cachedProfile = await this.getCachedProfile();
        if (cachedProfile) {
          return {
            success: true,
            data: cachedProfile,
          };
        }
        // No cached profile in bypass mode means no profile exists
        return {
          success: false,
          message: 'No profile found',
        };
      }

      const response = await this.makeRequest(`${this.baseUrl}${API_ENDPOINTS.PROFILE.GET_BY_ID}/${targetUserId}`, {
        method: 'GET',
      });

      if (response.success && response.data) {
        // Store profile data locally if it's the current user's profile
        if (!userId || userId === authApi.getCurrentUserId()) {
          await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(response.data));
        }
        
        return {
          success: true,
          data: response.data,
        };
      } else {
        throw new Error(response.message || 'Profile not found');
      }
    } catch (error) {
      console.error('Get Profile Error:', error);
      
      // For timeout/network errors, try to return cached profile
      if (error.message.includes('timeout') || error.message.includes('Network')) {
        const cachedProfile = await this.getCachedProfile();
        if (cachedProfile) {
          return {
            success: true,
            data: cachedProfile,
          };
        }
      }
      
      return {
        success: false,
        message: error.message || 'Failed to load profile. Please try again.',
      };
    }
  }

  // Update existing profile
  async updateProfile(profileData) {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      // Format dates before processing
      const formattedProfileData = this.formatProfileDates(profileData);

      // Check for bypass mode - save locally without API call
      if (userId === 'bypass_user_1234567890') {
        const updatedProfile = {
          ...formattedProfileData,
          userId,
          updatedAt: new Date().toISOString(),
        };
        
        await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updatedProfile));
        
        return {
          success: true,
          message: 'Profile updated successfully (offline mode)',
          data: updatedProfile,
        };
      }

      const payload = {
        userId,
        ...formattedProfileData,
      };

      const response = await this.makeRequest(`${this.baseUrl}${API_ENDPOINTS.PROFILE.UPDATE}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (response.success) {
        // Update locally stored profile data
        await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(response.data));
        
        return {
          success: true,
          message: response.message || 'Profile updated successfully',
          data: response.data,
        };
      } else {
        throw new Error(response.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Update Profile Error:', error);
      
      // For timeout/network errors, save locally as fallback
      if (error.message.includes('timeout') || error.message.includes('Network')) {
        try {
          const userId = authApi.getCurrentUserId();
          // Format dates before saving locally
          const formattedProfileData = this.formatProfileDates(profileData);
          const updatedProfile = {
            ...formattedProfileData,
            userId,
            updatedAt: new Date().toISOString(),
          };
          
          await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updatedProfile));
          
          return {
            success: true,
            message: 'Profile updated locally (offline mode)',
            data: updatedProfile,
          };
        } catch (localError) {
          console.error('Local storage error:', localError);
        }
      }
      
      return {
        success: false,
        message: error.message || 'Failed to update profile. Please try again.',
      };
    }
  }

  // Complete profile setup with image upload
  async completeProfileSetup(profileData, imageUri = null) {
    try {
      let profileImageUrl = null;

      // Handle image upload if provided
      if (imageUri) {
        const fileName = `profile_${authApi.getCurrentUserId()}_${Date.now()}.jpg`;
        const fileType = 'image/jpeg';

        // Get presigned URL
        const uploadUrlResult = await this.getUploadUrl(fileName, fileType);
        if (!uploadUrlResult.success) {
          throw new Error(uploadUrlResult.message);
        }
        console.log('Obtained upload URL:', uploadUrlResult);
        // Upload image
        const uploadResult = await this.uploadImage(fileName,uploadUrlResult.uploadUrl, imageUri, fileType);
        if (!uploadResult.success) {
          throw new Error(uploadResult.message);
        }

        profileImageUrl = fileName;
      }

      // Create/update profile with image URL
      const profileResult = await this.createOrUpdateProfile({
        ...profileData,
        profileImageUrl,
      });

      return profileResult;
    } catch (error) {
      console.error('Complete Profile Setup Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to complete profile setup. Please try again.',
      };
    }
  }

  // Get cached profile data
  async getCachedProfile() {
    try {
      const cachedProfile = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      return cachedProfile ? JSON.parse(cachedProfile) : null;
    } catch (error) {
      console.error('Get Cached Profile Error:', error);
      return null;
    }
  }

  // Clear cached profile data
  async clearCachedProfile() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
    } catch (error) {
      console.error('Clear Cached Profile Error:', error);
    }
  }

  // Validate profile data
  validateProfileData(profileData) {
    const errors = [];

    // Name validation
    if (!profileData.name || profileData.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }

    if (profileData.name && profileData.name.length > 50) {
      errors.push('Name must be less than 50 characters');
    }

    // Profession validation
    if (!profileData.profession || profileData.profession.trim().length < 2) {
      errors.push('Profession is required and must be at least 2 characters long');
    }

    if (profileData.profession && profileData.profession.length > 100) {
      errors.push('Profession must be less than 100 characters');
    }

    // Email validation
    if (profileData.email && profileData.email.length > 100) {
      errors.push('Email must be less than 100 characters');
    }

    if (profileData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      errors.push('Please enter a valid email address');
    }

    // Bio validation
    if (profileData.bio && profileData.bio.length > 500) {
      errors.push('Bio must be less than 500 characters');
    }

    // Location validation
    if (profileData.location && profileData.location.length > 100) {
      errors.push('Location must be less than 100 characters');
    }

    // Topics validation
    if (profileData.topics) {
      if (!Array.isArray(profileData.topics)) {
        errors.push('Topics must be an array');
      } else {
        profileData.topics.forEach((topic, index) => {
          if (typeof topic !== 'string' || topic.trim().length === 0) {
            errors.push(`Topic ${index + 1} must be a non-empty string`);
          }
          if (topic.length > 50) {
            errors.push(`Topic ${index + 1} must be less than 50 characters`);
          }
        });
      }
    }

    // Skills validation
    if (profileData.skills) {
      if (!Array.isArray(profileData.skills)) {
        errors.push('Skills must be an array');
      } else {
        profileData.skills.forEach((skill, index) => {
          if (typeof skill !== 'string' || skill.trim().length === 0) {
            errors.push(`Skill ${index + 1} must be a non-empty string`);
          }
          if (skill.length > 50) {
            errors.push(`Skill ${index + 1} must be less than 50 characters`);
          }
        });
      }
    }

    // Experiences validation
    if (profileData.experiences) {
      if (!Array.isArray(profileData.experiences)) {
        errors.push('Experiences must be an array');
      } else {
        profileData.experiences.forEach((exp, index) => {
          if (!exp.company || exp.company.trim().length === 0) {
            errors.push(`Experience ${index + 1}: Company is required`);
          }
          if (!exp.role || exp.role.trim().length === 0) {
            errors.push(`Experience ${index + 1}: Role is required`);
          }
          if (exp.company && exp.company.length > 100) {
            errors.push(`Experience ${index + 1}: Company name must be less than 100 characters`);
          }
          if (exp.role && exp.role.length > 100) {
            errors.push(`Experience ${index + 1}: Role must be less than 100 characters`);
          }
          if (exp.description && exp.description.length > 500) {
            errors.push(`Experience ${index + 1}: Description must be less than 500 characters`);
          }
        });
      }
    }

    // Education validation
    if (profileData.education) {
      if (!Array.isArray(profileData.education)) {
        errors.push('Education must be an array');
      } else {
        profileData.education.forEach((edu, index) => {
          if (!edu.institution || edu.institution.trim().length === 0) {
            errors.push(`Education ${index + 1}: Institution is required`);
          }
          if (!edu.degree || edu.degree.trim().length === 0) {
            errors.push(`Education ${index + 1}: Degree is required`);
          }
          if (edu.institution && edu.institution.length > 100) {
            errors.push(`Education ${index + 1}: Institution name must be less than 100 characters`);
          }
          if (edu.degree && edu.degree.length > 100) {
            errors.push(`Education ${index + 1}: Degree must be less than 100 characters`);
          }
          if (edu.fieldOfStudy && edu.fieldOfStudy.length > 100) {
            errors.push(`Education ${index + 1}: Field of study must be less than 100 characters`);
          }
          if (edu.grade && edu.grade.length > 20) {
            errors.push(`Education ${index + 1}: Grade must be less than 20 characters`);
          }
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Get image source with auth headers for profile pictures
  getImageSource(mediaKey, userToken) {
    if (!mediaKey) {
      return require('../assets/icon.png');
    }
    
    // If it's already a full URL (presigned S3 URL), return it directly
    if (mediaKey.startsWith('http')) {
      return { uri: mediaKey };
    }
    
    // Otherwise, use the profile service's media proxy
    return {
      uri: this.getMediaDisplayUrl(mediaKey),
      headers: {
        'Authorization': `Bearer ${userToken}`,
      },
    };
  }

  // Get media display URL for profile pictures
  getMediaDisplayUrl(mediaKey) {
    // Use the profile service's media proxy endpoint
    return `${this.baseUrl}/profile/media/proxy?key=${encodeURIComponent(mediaKey)}`;
  }

  // Report a user profile
  async reportProfile(userId, reason, description = null) {
    try {
      const currentUserId = authApi.getCurrentUserId();
      if (!currentUserId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!reason || reason.trim().length === 0) {
        throw new Error('Reason is required');
      }

      console.log('🚩 Reporting profile:', { userId, reason, hasDescription: !!description });

      const payload = {
        reason: reason.trim()
      };

      if (description && description.trim()) {
        payload.description = description.trim();
      }

      const response = await this.makeRequest(`${this.baseUrl}/profile/profile/${userId}/report`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (response.success) {
        console.log('✅ Profile reported successfully:', response.data);
        return {
          success: true,
          data: response.data,
          message: response.message || 'Profile reported successfully. Our team will review it.'
        };
      } else {
        throw new Error(response.message || 'Failed to report profile');
      }
    } catch (error) {
      console.error('❌ Report Profile Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to report profile. Please try again.'
      };
    }
  }
}

// Create and export singleton instance
const profileApi = new ProfileApiService();

export default profileApi;
