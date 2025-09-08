import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  API_ENDPOINTS, 
  STORAGE_KEYS, 
  REQUEST_CONFIG, 
  ERROR_MESSAGES,
  getApiBaseUrl,
  getCommonHeaders 
} from '../config/apiConfig';
import authApi from './AuthApi';

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

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_CONFIG.TIMEOUT);
        config.signal = controller.signal;

        const response = await fetch(url, config);
        clearTimeout(timeoutId);

        const data = await response.json();

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
          uploadUrl: response.data.uploadUrl,
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
  async uploadImage(uploadUrl, imageUri, fileType) {
    try {
      // Create form data for image upload
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: fileType,
        name: 'profile-image.jpg',
      });

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: formData,
        headers: {
          'Content-Type': fileType,
        },
      });

      if (response.ok) {
        return { success: true };
      } else {
        throw new Error('Failed to upload image');
      }
    } catch (error) {
      console.error('Upload Image Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to upload image. Please try again.',
      };
    }
  }

  // Create or update user profile
  async createOrUpdateProfile(profileData) {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      // Check if we're in bypass mode (for demo)
      if (userId === 'bypass_user_9999999999') {
        console.log('Using bypass mode for profile creation');
        
        // Create mock profile data for bypass mode
        const mockProfileData = {
          userId: userId,
          name: profileData.name,
          profession: profileData.profession,
          email: profileData.email,
          profilePic: profileData.profileImageUrl || null,
          topics: profileData.topics || [],
          experiences: profileData.experiences || [],
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
        name: profileData.name,
        profession: profileData.profession,
        email: profileData.email,
        profilePic: profileData.profileImageUrl || null,
        experiences: profileData.experiences || [],
        topics: profileData.topics || [],
      };

      const response = await this.makeRequest(`${this.baseUrl}${API_ENDPOINTS.PROFILE.CREATE_UPDATE}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

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
        
        const mockProfileData = {
          userId: authApi.getCurrentUserId(),
          name: profileData.name,
          profession: profileData.profession,
          email: profileData.email,
          profilePic: profileData.profileImageUrl || null,
          topics: profileData.topics || [],
          experiences: profileData.experiences || [],
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
      if (targetUserId === 'bypass_user_9999999999') {
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

      // Check for bypass mode - save locally without API call
      if (userId === 'bypass_user_9999999999') {
        const updatedProfile = {
          ...profileData,
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
        ...profileData,
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
          const updatedProfile = {
            ...profileData,
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

        // Upload image
        const uploadResult = await this.uploadImage(uploadUrlResult.uploadUrl, imageUri, fileType);
        if (!uploadResult.success) {
          throw new Error(uploadResult.message);
        }

        profileImageUrl = uploadUrlResult.imageUrl;
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

    if (!profileData.name || profileData.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }

    if (profileData.name && profileData.name.length > 50) {
      errors.push('Name must be less than 50 characters');
    }

    if (!profileData.profession || profileData.profession.trim().length < 2) {
      errors.push('Profession is required and must be at least 2 characters long');
    }

    if (profileData.profession && profileData.profession.length > 100) {
      errors.push('Profession must be less than 100 characters');
    }

    if (profileData.email && profileData.email.length > 100) {
      errors.push('Email must be less than 100 characters');
    }

    if (profileData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      errors.push('Please enter a valid email address');
    }

    if (profileData.bio && profileData.bio.length > 500) {
      errors.push('Bio must be less than 500 characters');
    }

    if (profileData.location && profileData.location.length > 100) {
      errors.push('Location must be less than 100 characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Create and export singleton instance
const profileApi = new ProfileApiService();

export default profileApi;
