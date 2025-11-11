import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS, REQUEST_CONFIG, STORAGE_KEYS, ERROR_MESSAGES, getCommonHeaders } from '../config/apiConfig';
import apiLogger from '../services/ApiLogger';

class ConnectionApi {
  constructor() {
    this.baseURL = API_ENDPOINTS.CONNECTION.BASE_URL;
  }

  // Get stored access token
  async getAccessToken() {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  // Handle API errors
  handleApiError(error, operation) {
    console.error(`ConnectionApi ${operation} error:`, error);
    
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED };
        case 400:
          return { success: false, error: data?.message || 'Invalid request' };
        case 404:
          return { success: false, error: 'User not found' };
        case 409:
          return { success: false, error: data?.message || 'Connection already exists' };
        case 500:
          return { success: false, error: ERROR_MESSAGES.SERVER_ERROR };
        default:
          return { success: false, error: data?.message || ERROR_MESSAGES.GENERIC_ERROR };
      }
    } else if (error.code === 'ECONNABORTED') {
      return { success: false, error: ERROR_MESSAGES.TIMEOUT_ERROR };
    } else if (error.message === 'Network Error') {
      return { success: false, error: ERROR_MESSAGES.NETWORK_ERROR };
    } else {
      return { success: false, error: ERROR_MESSAGES.GENERIC_ERROR };
    }
  }

  // Make authenticated request
  async makeRequest(url, options = {}) {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED };
      }

      const headers = getCommonHeaders(true, accessToken);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_CONFIG.TIMEOUT);
      
      const method = (options.method || 'GET').toUpperCase();
      apiLogger.logApiCall(url, method);

      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }

        apiLogger.logApiResponse(
          url,
          method,
          response.status,
          errorData,
          errorData.message || ERROR_MESSAGES.GENERIC_ERROR
        );
        
        return {
          success: false,
          error: errorData.message || ERROR_MESSAGES.GENERIC_ERROR,
            status: response.status,
        };
      }

      const data = await response.json();
      apiLogger.logApiResponse(url, method, response.status, data);
      return { success: true, data: data.data || data };
    } catch (error) {
      if (error.name === 'AbortError') {
        return { success: false, error: ERROR_MESSAGES.TIMEOUT_ERROR };
      }
      
      return this.handleApiError(error, 'makeRequest');
    }
  }

  // Send connection request
  async sendConnectionRequest(receiverId) {
    try {
      if (!receiverId) {
        return { success: false, error: 'Receiver ID is required' };
      }

      const url = `${this.baseURL}${API_ENDPOINTS.CONNECTION.SEND_REQUEST}`;
      return await this.makeRequest(url, {
        method: 'POST',
        body: JSON.stringify({ receiverId }),
      });
    } catch (error) {
      return this.handleApiError(error, 'sendConnectionRequest');
    }
  }

  // Accept connection request
  async acceptConnectionRequest(connectionId) {
    try {
      if (!connectionId) {
        return { success: false, error: 'Connection ID is required' };
      }

      const url = `${this.baseURL}${API_ENDPOINTS.CONNECTION.ACCEPT_REQUEST}/${connectionId}`;
      return await this.makeRequest(url, {
        method: 'PUT',
      });
    } catch (error) {
      return this.handleApiError(error, 'acceptConnectionRequest');
    }
  }

  // Reject connection request
  async rejectConnectionRequest(connectionId) {
    try {
      if (!connectionId) {
        return { success: false, error: 'Connection ID is required' };
      }

      const url = `${this.baseURL}${API_ENDPOINTS.CONNECTION.REJECT_REQUEST}/${connectionId}`;
      return await this.makeRequest(url, {
        method: 'PUT',
      });
    } catch (error) {
      return this.handleApiError(error, 'rejectConnectionRequest');
    }
  }

  // Get sent connection requests
  async getSentRequests(page = 1, limit = 10) {
    try {
      const url = `${this.baseURL}${API_ENDPOINTS.CONNECTION.GET_SENT}?page=${page}&limit=${limit}`;
      return await this.makeRequest(url, { method: 'GET' });
    } catch (error) {
      return this.handleApiError(error, 'getSentRequests');
    }
  }

  // Get received connection requests
  async getReceivedRequests(page = 1, limit = 10) {
    try {
      const url = `${this.baseURL}${API_ENDPOINTS.CONNECTION.GET_RECEIVED}?page=${page}&limit=${limit}`;
      return await this.makeRequest(url, { method: 'GET' });
    } catch (error) {
      return this.handleApiError(error, 'getReceivedRequests');
    }
  }

  // Get connections (friends)
  async getConnections(page = 1, limit = 10) {
    try {
      const url = `${this.baseURL}${API_ENDPOINTS.CONNECTION.GET_FRIENDS}?page=${page}&limit=${limit}`;
      return await this.makeRequest(url, { method: 'GET' });
    } catch (error) {
      return this.handleApiError(error, 'getConnections');
    }
  }

  // Get connections for a specific user (for viewing their profile)
  async getUserConnections(userId, page = 1, limit = 1) {
    try {
      if (!userId) {
        return { success: false, error: 'User ID is required' };
      }

      // Use the friends endpoint to obtain the connection count for the requested user
      const url = `${this.baseURL}${API_ENDPOINTS.CONNECTION.GET_FRIENDS}/${userId}?page=${page}&limit=${limit}`;
      return await this.makeRequest(url, { method: 'GET' });
    } catch (error) {
      return this.handleApiError(error, 'getUserConnections');
    }
  }

  // Remove connection
  async removeConnection(targetUserId) {
    try {
      if (!targetUserId) {
        return { success: false, error: 'Target user ID is required' };
      }

      const url = `${this.baseURL}${API_ENDPOINTS.CONNECTION.REMOVE}/${targetUserId}`;
      return await this.makeRequest(url, { method: 'DELETE' });
    } catch (error) {
      return this.handleApiError(error, 'removeConnection');
    }
  }

  // Get connection status
  async getConnectionStatus(targetUserId) {
    try {
      if (!targetUserId) {
        return { success: false, error: 'Target user ID is required' };
      }

      const url = `${this.baseURL}${API_ENDPOINTS.CONNECTION.GET_STATUS}/${targetUserId}`;
      return await this.makeRequest(url, { method: 'GET' });
    } catch (error) {
      return this.handleApiError(error, 'getConnectionStatus');
    }
  }

  // Health check
  async healthCheck() {
    try {
      const url = `${this.baseURL}${API_ENDPOINTS.CONNECTION.HEALTH}`;
      const response = await fetch(url, {
        method: 'GET',
        timeout: REQUEST_CONFIG.TIMEOUT,
      });

      return response.ok;
    } catch (error) {
      console.error('Connection service health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export default new ConnectionApi();
