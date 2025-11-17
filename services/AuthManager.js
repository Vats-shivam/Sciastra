import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/apiConfig';
import authApi from '../api/AuthApi';
import profileApi from '../api/ProfileApi';
import chatApi from '../api/ChatApi';

class AuthManager {
  constructor() {
    this.isInitialized = false;
    this.authState = {
      isAuthenticated: false,
      isLoading: true,
      user: null,
      hasCompletedOnboarding: false,
    };
    this.listeners = new Set();
  }

  // Initialize the auth manager
  async initialize() {
    if (this.isInitialized) {
      return this.authState;
    }

    try {
      console.log('AuthManager: Initializing...');
      
      // Check stored authentication state
      const authStatus = await authApi.checkAuthStatus();
      
      if (authStatus.isAuthenticated) {
        // Try to load user profile
        const profileResult = await profileApi.getCachedProfile();
        
        // Check onboarding status
        const onboardingCompleted = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
        
        this.authState = {
          isAuthenticated: true,
          isLoading: false,
          user: profileResult || { userId: authStatus.userId },
          hasCompletedOnboarding: onboardingCompleted === 'true',
        };

        // Initialize chat socket if authenticated
        await this.initializeChatSocket();
      } else {
        this.authState = {
          isAuthenticated: false,
          isLoading: false,
          user: null,
          hasCompletedOnboarding: false,
        };
      }

      this.isInitialized = true;
      this.notifyListeners();
      
      console.log('AuthManager: Initialized with state:', this.authState);
      return this.authState;
    } catch (error) {
      console.error('AuthManager initialization error:', error);
      this.authState = {
        isAuthenticated: false,
        isLoading: false,
        user: null,
        hasCompletedOnboarding: false,
      };
      this.isInitialized = true;
      this.notifyListeners();
      return this.authState;
    }
  }

  // Login with phone and OTP
  async login(phoneNumber, otp) {
    try {
      console.log('AuthManager: Attempting login...');
      this.setLoading(true);

      // Verify OTP
      const result = await authApi.verifyOtp(phoneNumber, otp);
      
      if (result.success) {
        // Check if user has a profile
        const profileResult = await profileApi.getProfile();
        
        // Check onboarding status
        const onboardingCompleted = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
        
        this.authState = {
          isAuthenticated: true,
          isLoading: false,
          user: profileResult.success ? profileResult.data : { userId: result.data.userId },
          hasCompletedOnboarding: onboardingCompleted === 'true',
        };

        // Initialize chat socket
        await this.initializeChatSocket();
        
        this.notifyListeners();
        console.log('AuthManager: Login successful');
        
        return {
          success: true,
          needsProfileSetup: !profileResult.success,
          needsOnboarding: !this.authState.hasCompletedOnboarding,
        };
      } else {
        this.setLoading(false);
        return result;
      }
    } catch (error) {
      console.error('AuthManager login error:', error);
      this.setLoading(false);
      return {
        success: false,
        message: error.message || 'Login failed. Please try again.',
      };
    }
  }

  // Complete profile setup
  async completeProfileSetup(profileData, imageUri = null) {
    try {
      console.log('AuthManager: Completing profile setup...');
      this.setLoading(true);

      const result = await profileApi.completeProfileSetup(profileData, imageUri);
      
      if (result.success) {
        // Update user state with the complete profile data
        this.authState = {
          ...this.authState,
          user: result.data,
          isLoading: false,
        };

        console.log('AuthManager: Profile setup completed, updated user:', this.authState.user);
        console.log('AuthManager: User name from result:', result.data?.name);
        console.log('AuthManager: needsProfileSetup after completion:', this.needsProfileSetup());
        console.log('AuthManager: needsOnboarding after completion:', this.needsOnboarding());

        // Force immediate notification
        this.notifyListeners();

        // Force a second notification after a brief delay to ensure state propagation
        setTimeout(() => {
          console.log('AuthManager: Second notification - needsProfileSetup:', this.needsProfileSetup());
          this.notifyListeners();
        }, 100);

        // Force a third notification to be absolutely sure
        setTimeout(() => {
          console.log('AuthManager: Third notification - needsProfileSetup:', this.needsProfileSetup());
          this.notifyListeners();
        }, 300);

        return result;
      } else {
        this.setLoading(false);
        return result;
      }
    } catch (error) {
      console.error('AuthManager profile setup error:', error);
      this.setLoading(false);
      return {
        success: false,
        message: error.message || 'Failed to complete profile setup.',
      };
    }
  }

  // Complete onboarding
  async completeOnboarding() {
    try {
      console.log('AuthManager: Completing onboarding...');
      
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
      
      this.authState = {
        ...this.authState,
        hasCompletedOnboarding: true,
        isLoading: false,
      };
      
      this.notifyListeners();
      console.log('AuthManager: Onboarding completed');
      
      return { success: true };
    } catch (error) {
      console.error('AuthManager onboarding completion error:', error);
      return {
        success: false,
        message: 'Failed to complete onboarding.',
      };
    }
  }

  // Logout user
  async logout() {
    try {
      console.log('AuthManager: Logging out...');
      this.setLoading(true);

      // Disconnect chat socket
      chatApi.disconnectSocket();

      // Clear auth tokens
      await authApi.logout();
      
      // Clear cached profile
      await profileApi.clearCachedProfile();
      
      // Clear onboarding status
      await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED);

      this.authState = {
        isAuthenticated: false,
        isLoading: false,
        user: null,
        hasCompletedOnboarding: false,
      };

      this.notifyListeners();
      console.log('AuthManager: Logout completed');
      
      return { success: true };
    } catch (error) {
      console.error('AuthManager logout error:', error);
      // Even if logout fails on server, clear local state
      this.authState = {
        isAuthenticated: false,
        isLoading: false,
        user: null,
        hasCompletedOnboarding: false,
      };
      this.notifyListeners();
      return { success: true };
    }
  }

  // Update user profile
  async updateProfile(profileData) {
    try {
      console.log('AuthManager: Updating profile...');
      
      const result = await profileApi.updateProfile(profileData);
      
      if (result.success) {
        this.authState.user = result.data;
        this.notifyListeners();
        console.log('AuthManager: Profile updated');
        return result;
      } else {
        return result;
      }
    } catch (error) {
      console.error('AuthManager profile update error:', error);
      return {
        success: false,
        message: error.message || 'Failed to update profile.',
      };
    }
  }

  // Initialize chat socket
  async initializeChatSocket() {
    try {
      if (this.authState.isAuthenticated) {
        console.log('AuthManager: Initializing chat socket...');
        const result = await chatApi.initializeSocket();
        if (result) {
          console.log('AuthManager: Chat socket initialized successfully');
        } else {
          console.log('AuthManager: Chat socket initialization failed, continuing without chat');
        }
      }
    } catch (error) {
      console.warn('AuthManager: Chat socket initialization failed, continuing without chat:', error.message);
      // Don't fail the entire auth flow if chat socket fails
    }
  }

  // Refresh user data
  async refreshUserData() {
    try {
      if (!this.authState.isAuthenticated) {
        return { success: false, message: 'Not authenticated' };
      }

      console.log('AuthManager: Refreshing user data...');
      
      const profileResult = await profileApi.getProfile();
      
      if (profileResult.success) {
        this.authState.user = profileResult.data;
        this.notifyListeners();
        return { success: true, data: profileResult.data };
      } else {
        return profileResult;
      }
    } catch (error) {
      console.error('AuthManager refresh user data error:', error);
      return {
        success: false,
        message: error.message || 'Failed to refresh user data.',
      };
    }
  }

  // Set loading state
  setLoading(isLoading) {
    this.authState.isLoading = isLoading;
    this.notifyListeners();
  }

  // Get current auth state
  getAuthState() {
    return this.authState;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this.authState.isAuthenticated;
  }

  // Check if user needs profile setup
  needsProfileSetup() {
    const needsSetup = this.authState.isAuthenticated && (!this.authState.user || !this.authState.user.name);
    console.log('AuthManager: needsProfileSetup check:', {
      isAuthenticated: this.authState.isAuthenticated,
      hasUser: !!this.authState.user,
      hasName: !!this.authState.user?.name,
      userName: this.authState.user?.name,
      needsSetup: needsSetup
    });
    return needsSetup;
  }

  // Check if user needs onboarding
  needsOnboarding() {
    const needsOnboarding = this.authState.isAuthenticated && !this.authState.hasCompletedOnboarding;
    console.log('AuthManager: needsOnboarding check:', {
      isAuthenticated: this.authState.isAuthenticated,
      hasCompletedOnboarding: this.authState.hasCompletedOnboarding,
      needsOnboarding: needsOnboarding
    });
    return needsOnboarding;
  }

  // Get current user
  getCurrentUser() {
    return this.authState.user;
  }

  // Add auth state listener
  addListener(callback) {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Notify all listeners
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.authState);
      } catch (error) {
        console.error('AuthManager listener error:', error);
      }
    });
  }

  // Handle token refresh
  async handleTokenRefresh() {
    try {
      const refreshed = await authApi.refreshAccessToken();
      if (!refreshed) {
        // Token refresh failed, logout user
        await this.logout();
        return false;
      }
      return true;
    } catch (error) {
      console.error('AuthManager token refresh error:', error);
      await this.logout();
      return false;
    }
  }

  // Check and handle authentication errors
  handleAuthError(error) {
    if (error.message === 'Session expired. Please login again.' || 
        error.message === 'UNAUTHORIZED') {
      this.logout();
    }
  }

  // Get navigation route based on auth state
  getInitialRoute() {
    if (!this.isInitialized || this.authState.isLoading) {
      return 'Splash';
    }

    if (!this.authState.isAuthenticated) {
      return 'Welcome';
    }

    if (this.needsProfileSetup()) {
      return 'ProfileSetup';
    }

    return 'MainTabs';
  }

  // Reset auth state (for development/testing)
  async reset() {
    console.log('AuthManager: Resetting auth state...');
    
    try {
      // Disconnect chat socket
      chatApi.disconnectSocket();
      
      // Clear all stored data
      await authApi.clearTokens();
      await profileApi.clearCachedProfile();
      await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
      
      this.authState = {
        isAuthenticated: false,
        isLoading: false,
        user: null,
        hasCompletedOnboarding: false,
      };
      
      this.isInitialized = true;
      this.notifyListeners();
      
      return { success: true };
    } catch (error) {
      console.error('AuthManager reset error:', error);
      return { success: false, message: error.message };
    }
  }
}

// Create and export singleton instance
const authManager = new AuthManager();

export default authManager;