import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  API_ENDPOINTS, 
  STORAGE_KEYS, 
  REQUEST_CONFIG, 
  ERROR_MESSAGES,
  getApiBaseUrl,
  getCommonHeaders 
} from '../config/apiConfig';
import apiLogger from '../services/ApiLogger';

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

        const method = (config.method || 'GET').toUpperCase();
        apiLogger.logApiCall(url, method);

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_CONFIG.TIMEOUT);

        config.signal = controller.signal;

        console.log('AuthApi: Making request to:', url);
        console.log('AuthApi: Request config:', JSON.stringify({
          method: config.method,
          headers: config.headers,
          body: config.body
        }, null, 2));

        const response = await fetch(url, config);
        clearTimeout(timeoutId);
        
        console.log('AuthApi: Response status:', response.status);
        console.log('AuthApi: Response headers:', response.headers.get('content-type'));

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
          console.log('AuthApi: JSON response data:', JSON.stringify(data, null, 2));
        } else {
          // Non-JSON response (likely HTML error page)
          const textResponse = await response.text();
          console.warn('Non-JSON response received. Status:', response.status, 'URL:', url);
          console.warn('Response text:', textResponse.substring(0, 300));
          
          // Create a standardized error response
          data = {
            success: false,
            message: this.getErrorMessage(response.status, 'Service temporarily unavailable'),
          };
        }

        apiLogger.logApiResponse(
          url,
          method,
          response.status,
          data,
          response.ok ? null : data?.message || 'Request failed'
        );

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
      
      // Static bypass for testing - phone number 1234567890 (as per integration prompt)
      if (formattedPhone === '+911234567890' || phoneNumber === '1234567890') {
        console.log('Using static bypass for phone number:', formattedPhone);
        return {
          success: true,
          message: 'OTP sent successfully (bypass mode)',
        };
      }
      
      const url = `${getApiBaseUrl('auth')}${API_ENDPOINTS.AUTH.SEND_OTP}`;
      console.log('Making OTP request to URL:', url);
      console.log('Request body:', JSON.stringify({ phoneNumber: formattedPhone }));
      
      const response = await this.makeRequest(url, {
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
      
      // Fallback to bypass mode if API fails for test number
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      if (cleanPhone === '1234567890') {
        console.log('API failed, using bypass mode for test phone number');
        return {
          success: true,
          message: 'OTP sent successfully (bypass mode - API unavailable)',
        };
      }
      
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
      
      // Static bypass for testing - phone number 1234567890 and OTP 197941 (as per integration prompt)
      if (formattedPhone === '+911234567890' && otp === '197941') {
        console.log('Using static bypass for OTP verification');
        
        // Generate mock tokens for bypass mode
        const mockTokens = {
          accessToken: 'bypass_access_token_' + Date.now(),
          refreshToken: 'bypass_refresh_token_' + Date.now(),
          userId: 'bypass_user_1234567890'
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
