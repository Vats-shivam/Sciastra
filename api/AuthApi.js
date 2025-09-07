import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  API_ENDPOINTS, 
  STORAGE_KEYS, 
  REQUEST_CONFIG, 
  ERROR_MESSAGES,
  getApiBaseUrl,
  getCommonHeaders 
} from '../config/apiConfig';

class AuthApiService {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.userId = null;
  }

  // Initialize tokens from storage
  async initializeTokens() {
    try {
      this.accessToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      this.refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      this.userId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
    } catch (error) {
      console.error('Error initializing tokens:', error);
    }
  }

  // Store tokens securely
  async storeTokens(accessToken, refreshToken, userId) {
    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.ACCESS_TOKEN, accessToken],
        [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
        [STORAGE_KEYS.USER_ID, userId],
      ]);
      
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      this.userId = userId;
    } catch (error) {
      console.error('Error storing tokens:', error);
      throw new Error('Failed to store authentication tokens');
    }
  }

  // Clear tokens (logout)
  async clearTokens() {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_ID,
      ]);
      
      this.accessToken = null;
      this.refreshToken = null;
      this.userId = null;
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  // Generic API request method with timeout and retry logic
  async makeRequest(url, options = {}) {
    const maxRetries = REQUEST_CONFIG.RETRY_ATTEMPTS;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const config = {
          headers: getCommonHeaders(!options.skipAuth, this.accessToken),
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
        if (response.status === 401 && this.refreshToken && !options.skipRefresh) {
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            // Retry the original request with new token
            return this.makeRequest(url, { ...options, skipRefresh: true });
          } else {
            // Refresh failed, clear tokens and throw error
            await this.clearTokens();
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
          console.error('API Request Error:', error);
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
        return apiMessage || ERROR_MESSAGES.GENERIC_ERROR;
      case 401:
        return ERROR_MESSAGES.UNAUTHORIZED;
      case 404:
        return 'Service not found. Please try again later.';
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

  // Send OTP to phone number
  async sendOtp(phoneNumber) {
    try {
      // Ensure phone number has country code
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      
      // Static bypass for testing - phone number 9999999999
      if (formattedPhone === '+919999999999') {
        console.log('Using static bypass for phone number:', formattedPhone);
        return {
          success: true,
          message: 'OTP sent successfully (bypass mode)',
        };
      }
      
      const response = await this.makeRequest(`${getApiBaseUrl('auth')}${API_ENDPOINTS.AUTH.SEND_OTP}`, {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: formattedPhone,
        }),
        skipAuth: true, // No auth needed for sending OTP
      });

      return {
        success: response.success,
        message: response.message || 'OTP sent successfully',
      };
    } catch (error) {
      console.error('Send OTP Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to send OTP. Please try again.',
      };
    }
  }

  // Verify OTP and get authentication tokens
  async verifyOtp(phoneNumber, otp) {
    try {
      // Ensure phone number has country code
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      
      // Static bypass for testing - phone number 9999999999 and OTP 123456
      if (formattedPhone === '+919999999999' && otp === '123456') {
        console.log('Using static bypass for OTP verification');
        
        // Generate mock tokens for bypass mode
        const mockTokens = {
          accessToken: 'bypass_access_token_' + Date.now(),
          refreshToken: 'bypass_refresh_token_' + Date.now(),
          userId: 'bypass_user_9999999999'
        };
        
        // Store mock tokens
        await this.storeTokens(
          mockTokens.accessToken,
          mockTokens.refreshToken,
          mockTokens.userId
        );

        return {
          success: true,
          message: 'OTP verified successfully (bypass mode)',
          data: mockTokens,
        };
      }
      
      const response = await this.makeRequest(`${getApiBaseUrl('auth')}${API_ENDPOINTS.AUTH.VERIFY_OTP}`, {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: formattedPhone,
          otp: otp,
        }),
        skipAuth: true, // No auth needed for OTP verification
      });

      if (response.success && response.data) {
        // Store tokens
        await this.storeTokens(
          response.data.accessToken,
          response.data.refreshToken,
          response.data.userId
        );

        return {
          success: true,
          message: response.message || 'OTP verified successfully',
          data: {
            accessToken: response.data.accessToken,
            refreshToken: response.data.refreshToken,
            userId: response.data.userId,
          },
        };
      } else {
        return {
          success: false,
          message: response.message || 'Invalid OTP. Please try again.',
        };
      }
    } catch (error) {
      console.error('Verify OTP Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to verify OTP. Please try again.',
      };
    }
  }

  // Refresh access token
  async refreshAccessToken() {
    try {
      if (!this.refreshToken) {
        return false;
      }

      const response = await this.makeRequest(`${getApiBaseUrl('auth')}${API_ENDPOINTS.AUTH.REFRESH_TOKEN}`, {
        method: 'POST',
        body: JSON.stringify({
          refreshToken: this.refreshToken,
        }),
        skipAuth: true,
        skipRefresh: true, // Prevent infinite loop
      });

      if (response.success && response.data && response.data.accessToken) {
        // Update stored access token
        await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.data.accessToken);
        this.accessToken = response.data.accessToken;
        return true;
      }

      return false;
    } catch (error) {
      console.error('Refresh Token Error:', error);
      return false;
    }
  }

  // Logout user
  async logout() {
    try {
      if (this.refreshToken) {
        // Call logout endpoint to invalidate refresh token
        await this.makeRequest(`${getApiBaseUrl('auth')}${API_ENDPOINTS.AUTH.LOGOUT}`, {
          method: 'POST',
          body: JSON.stringify({
            refreshToken: this.refreshToken,
          }),
        });
      }
    } catch (error) {
      console.error('Logout API Error:', error);
      // Continue with local logout even if API call fails
    } finally {
      // Clear local tokens
      await this.clearTokens();
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.accessToken;
  }

  // Get current user ID
  getCurrentUserId() {
    return this.userId;
  }

  // Get access token
  getAccessToken() {
    return this.accessToken;
  }

  // Validate phone number format
  validatePhoneNumber(phoneNumber) {
    // Remove any non-digit characters for validation
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    // Check if it's a valid 10-digit Indian number
    if (cleanPhone.length === 10 && /^[6-9]\d{9}$/.test(cleanPhone)) {
      return { isValid: true, formatted: `+91${cleanPhone}` };
    }
    
    // Check if it already has country code
    if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
      const phoneWithoutCode = cleanPhone.substring(2);
      if (/^[6-9]\d{9}$/.test(phoneWithoutCode)) {
        return { isValid: true, formatted: `+${cleanPhone}` };
      }
    }
    
    return { isValid: false, formatted: null };
  }

  // Check authentication status
  async checkAuthStatus() {
    await this.initializeTokens();
    return {
      isAuthenticated: this.isAuthenticated(),
      userId: this.userId,
      hasValidToken: !!this.accessToken,
    };
  }
}

// Create and export singleton instance
const authApi = new AuthApiService();

// Initialize tokens when the module is imported
authApi.initializeTokens();

export default authApi;
