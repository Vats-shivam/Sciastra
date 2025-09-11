import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS, REQUEST_CONFIG, STORAGE_KEYS, ERROR_MESSAGES, getCommonHeaders } from '../config/apiConfig';

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

  // Make authenticated request with fallback to mock data
  async makeRequest(url, options = {}) {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        // Fallback to mock data for demo purposes
        return this.getMockResponse(url, options);
      }

      const headers = getCommonHeaders(true, accessToken);
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_CONFIG.TIMEOUT);
      
      console.log('ConnectionApi: Making request to:', url, 'with options:', options);
      
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
        
        throw {
          response: {
            status: response.status,
            data: errorData,
          },
        };
      }

      const data = await response.json();
      console.log('ConnectionApi: Response received:', JSON.stringify(data, null, 2));
      return { success: true, data: data.data || data };
    } catch (error) {
      if (error.name === 'AbortError') {
        return { success: false, error: ERROR_MESSAGES.TIMEOUT_ERROR };
      }
      
      console.log('ConnectionApi: Request failed, falling back to mock:', error.message);
      // Fallback to mock data if network fails
      return this.getMockResponse(url, options);
    }
  }

  // Mock responses for demo/testing
  getMockResponse(url, options = {}) {
    console.log('ConnectionApi: Using mock response for:', url, options.method);
    
    // Store connection states in AsyncStorage for persistence
    const storageKey = 'mock_connections';
    
    if (url.includes('/status/')) {
      const userId = url.split('/').pop();
      return this.getMockStatus(userId);
    }
    
    if (url.includes('/request') && options.method === 'POST') {
      return this.mockSendRequest(JSON.parse(options.body || '{}'));
    }
    
    if (url.includes('/accept/') && options.method === 'PUT') {
      const connectionId = url.split('/').pop();
      return this.mockAcceptRequest(connectionId);
    }
    
    if (url.includes('/reject/') && options.method === 'PUT') {
      const connectionId = url.split('/').pop();
      return this.mockRejectRequest(connectionId);
    }
    
    if (url.includes('/received')) {
      return this.getMockReceivedRequests();
    }
    
    if (url.includes('/sent')) {
      return this.getMockSentRequests();
    }
    
    return { success: true, data: {} };
  }

  async getMockStatus(userId) {
    try {
      const connections = await AsyncStorage.getItem('mock_connections');
      const connectionData = connections ? JSON.parse(connections) : {};
      const userConnection = connectionData[userId];
      
      if (!userConnection) {
        return {
          success: true,
          data: {
            status: 'NONE',
            connectionId: null,
            isIncoming: false
          }
        };
      }
      
      return {
        success: true,
        data: {
          status: userConnection.status,
          connectionId: userConnection.connectionId,
          isIncoming: userConnection.isIncoming
        }
      };
    } catch (error) {
      return {
        success: true,
        data: { status: 'NONE', connectionId: null, isIncoming: false }
      };
    }
  }

  async mockSendRequest(body) {
    try {
      const connections = await AsyncStorage.getItem('mock_connections');
      const connectionData = connections ? JSON.parse(connections) : {};
      
      const connectionId = `conn_${Date.now()}`;
      connectionData[body.receiverId] = {
        status: 'PENDING',
        connectionId: connectionId,
        isIncoming: false,
        createdAt: new Date().toISOString()
      };
      
      await AsyncStorage.setItem('mock_connections', JSON.stringify(connectionData));
      
      return {
        success: true,
        data: { connectionId, message: 'Connection request sent successfully' }
      };
    } catch (error) {
      return { success: false, error: 'Failed to send connection request' };
    }
  }

  async mockAcceptRequest(connectionId) {
    try {
      const connections = await AsyncStorage.getItem('mock_connections');
      const connectionData = connections ? JSON.parse(connections) : {};
      
      // Find and update the connection
      for (const userId in connectionData) {
        if (connectionData[userId].connectionId === connectionId) {
          connectionData[userId].status = 'ACCEPTED';
          break;
        }
      }
      
      await AsyncStorage.setItem('mock_connections', JSON.stringify(connectionData));
      
      return {
        success: true,
        data: { message: 'Connection request accepted' }
      };
    } catch (error) {
      return { success: false, error: 'Failed to accept connection request' };
    }
  }

  async mockRejectRequest(connectionId) {
    try {
      const connections = await AsyncStorage.getItem('mock_connections');
      const connectionData = connections ? JSON.parse(connections) : {};
      
      // Find and remove the connection
      for (const userId in connectionData) {
        if (connectionData[userId].connectionId === connectionId) {
          delete connectionData[userId];
          break;
        }
      }
      
      await AsyncStorage.setItem('mock_connections', JSON.stringify(connectionData));
      
      return {
        success: true,
        data: { message: 'Connection request rejected' }
      };
    } catch (error) {
      return { success: false, error: 'Failed to reject connection request' };
    }
  }

  async getMockReceivedRequests() {
    try {
      const connections = await AsyncStorage.getItem('mock_connections');
      const connectionData = connections ? JSON.parse(connections) : {};
      
      const receivedRequests = [];
      for (const userId in connectionData) {
        if (connectionData[userId].isIncoming && connectionData[userId].status === 'PENDING') {
          receivedRequests.push({
            id: connectionData[userId].connectionId,
            status: 'PENDING',
            createdAt: connectionData[userId].createdAt,
            user: {
              id: userId,
              name: connectionData[userId].fromUserName || `User ${userId}`,
              profession: 'Mock User',
              profilePic: null
            }
          });
        }
      }
      
      return {
        success: true,
        data: {
          connections: receivedRequests,
          pagination: {
            page: 1,
            limit: 50,
            total: receivedRequests.length,
            pages: 1
          }
        }
      };
    } catch (error) {
      return {
        success: true,
        data: {
          connections: [],
          pagination: { page: 1, limit: 50, total: 0, pages: 1 }
        }
      };
    }
  }

  async getMockSentRequests() {
    try {
      const connections = await AsyncStorage.getItem('mock_connections');
      const connectionData = connections ? JSON.parse(connections) : {};
      
      const sentRequests = [];
      for (const userId in connectionData) {
        if (!connectionData[userId].isIncoming && connectionData[userId].status === 'PENDING') {
          sentRequests.push({
            id: connectionData[userId].connectionId,
            status: 'PENDING',
            createdAt: connectionData[userId].createdAt,
            user: {
              id: userId,
              name: `User ${userId}`,
              profession: 'Mock User',
              profilePic: null
            }
          });
        }
      }
      
      return {
        success: true,
        data: {
          connections: sentRequests,
          pagination: {
            page: 1,
            limit: 50,
            total: sentRequests.length,
            pages: 1
          }
        }
      };
    } catch (error) {
      return {
        success: true,
        data: {
          connections: [],
          pagination: { page: 1, limit: 50, total: 0, pages: 1 }
        }
      };
    }
  }

  // Send connection request
  async sendConnectionRequest(receiverId) {
    try {
      if (!receiverId) {
        return { success: false, error: 'Receiver ID is required' };
      }

      const url = `${this.baseURL}${API_ENDPOINTS.CONNECTION.SEND_REQUEST}`;
      const result = await this.makeRequest(url, {
        method: 'POST',
        body: JSON.stringify({ receiverId }),
      });

      return result;
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
      const result = await this.makeRequest(url, {
        method: 'PUT',
      });

      return result;
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
      const result = await this.makeRequest(url, {
        method: 'PUT',
      });

      return result;
    } catch (error) {
      return this.handleApiError(error, 'rejectConnectionRequest');
    }
  }

  // Get sent connection requests
  async getSentRequests(page = 1, limit = 10) {
    try {
      const url = `${this.baseURL}${API_ENDPOINTS.CONNECTION.GET_SENT}?page=${page}&limit=${limit}`;
      const result = await this.makeRequest(url, {
        method: 'GET',
      });

      return result;
    } catch (error) {
      return this.handleApiError(error, 'getSentRequests');
    }
  }

  // Get received connection requests
  async getReceivedRequests(page = 1, limit = 10) {
    try {
      const url = `${this.baseURL}${API_ENDPOINTS.CONNECTION.GET_RECEIVED}?page=${page}&limit=${limit}`;
      const result = await this.makeRequest(url, {
        method: 'GET',
      });

      return result;
    } catch (error) {
      return this.handleApiError(error, 'getReceivedRequests');
    }
  }

  // Get connections (friends)
  async getConnections(page = 1, limit = 10) {
    try {
      const url = `${this.baseURL}${API_ENDPOINTS.CONNECTION.GET_FRIENDS}?page=${page}&limit=${limit}`;
      const result = await this.makeRequest(url, {
        method: 'GET',
      });

      return result;
    } catch (error) {
      return this.handleApiError(error, 'getConnections');
    }
  }

  // Remove connection
  async removeConnection(targetUserId) {
    try {
      if (!targetUserId) {
        return { success: false, error: 'Target user ID is required' };
      }

      const url = `${this.baseURL}${API_ENDPOINTS.CONNECTION.REMOVE}/${targetUserId}`;
      const result = await this.makeRequest(url, {
        method: 'DELETE',
      });

      return result;
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
      const result = await this.makeRequest(url, {
        method: 'GET',
      });

      return result;
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

  // Utility function to create mock incoming requests for testing
  async createMockIncomingRequest(fromUserId, fromUserName = null) {
    try {
      const connections = await AsyncStorage.getItem('mock_connections');
      const connectionData = connections ? JSON.parse(connections) : {};
      
      const connectionId = `conn_incoming_${Date.now()}`;
      connectionData[fromUserId] = {
        status: 'PENDING',
        connectionId: connectionId,
        isIncoming: true,
        createdAt: new Date().toISOString(),
        fromUserName: fromUserName || `User ${fromUserId}`
      };
      
      await AsyncStorage.setItem('mock_connections', JSON.stringify(connectionData));
      
      console.log('Created mock incoming request from:', fromUserId, 'with ID:', connectionId);
      return { success: true, connectionId };
    } catch (error) {
      console.error('Error creating mock incoming request:', error);
      return { success: false, error: error.message };
    }
  }

  // Utility function to clear all mock connections (for testing)
  async clearMockConnections() {
    try {
      await AsyncStorage.removeItem('mock_connections');
      console.log('Cleared all mock connections');
      return { success: true };
    } catch (error) {
      console.error('Error clearing mock connections:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export default new ConnectionApi();
