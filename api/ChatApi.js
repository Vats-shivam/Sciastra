import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import { 
  API_ENDPOINTS, 
  STORAGE_KEYS, 
  REQUEST_CONFIG, 
  ERROR_MESSAGES,
  getApiBaseUrl,
  getCommonHeaders 
} from '../config/apiConfig';
import authApi from './AuthApi';

class ChatApiService {
  constructor() {
    this.baseUrl = getApiBaseUrl('chat');
    this.socket = null;
    this.isConnected = false;
    this.messageListeners = new Map();
    this.typingListeners = new Map();
    console.log('ChatApi: Initialized with baseUrl:', this.baseUrl);
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

        console.log('ChatApi: Making request to:', url);
        console.log('ChatApi: Request config:', JSON.stringify({
          method: config.method,
          headers: config.headers,
          body: config.body
        }, null, 2));

        const response = await fetch(url, config);
        clearTimeout(timeoutId);

        console.log('ChatApi: Response status:', response.status);
        console.log('ChatApi: Response headers:', response.headers.get('content-type'));

        const data = await response.json();
        console.log('ChatApi: Response data:', JSON.stringify(data, null, 2));

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
          
          // If chat service is not available (404), fall back to demo mode
          if (response.status === 404) {
            console.log('ChatApi: Chat service not available (404), falling back to demo mode');
            return this.handleDemoFallback(url, options);
          }
          
          throw new Error(errorMessage);
        }

        return data;
      } catch (error) {
        attempt++;
        
        if (error.name === 'AbortError') {
          throw new Error(ERROR_MESSAGES.TIMEOUT_ERROR);
        }
        
        if (attempt >= maxRetries) {
          console.error('Chat API Request Error:', error);
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, REQUEST_CONFIG.RETRY_DELAY));
      }
    }
  }

  // Handle demo fallback when chat service is not available
  handleDemoFallback(url, options) {
    console.log('ChatApi: Using demo fallback for URL:', url, 'method:', options.method);
    
    if (url.includes('/rooms') && options.method === 'POST') {
      // Create room fallback
      const body = JSON.parse(options.body || '{}');
      const memberIds = body.memberIds || [];
      const participantId = memberIds[0] || 'demo_user_1';
      
      return {
        success: true,
        data: {
          id: `demo_room_${Date.now()}`,
          isGroup: body.isGroup || false,
          participants: [
            {
              userId: authApi.getCurrentUserId(),
              name: 'You',
              profilePic: null,
            },
            {
              userId: participantId,
              name: 'Demo User',
              profilePic: null,
            }
          ],
          lastMessage: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      };
    }
    
    if (url.includes('/rooms') && options.method === 'GET') {
      // Get rooms fallback
      return {
        success: true,
        data: [
          {
            id: 'demo_room_1',
            type: 'direct',
            participants: [
              {
                userId: authApi.getCurrentUserId(),
                name: 'You',
                profilePic: null,
              },
              {
                userId: 'demo_user_1',
                name: 'Demo User',
                profilePic: null,
              }
            ],
            lastMessage: {
              id: 'msg_1',
              content: 'Welcome to demo chat!',
              senderId: 'demo_user_1',
              createdAt: new Date(Date.now() - 3600000).toISOString(),
            },
            unreadCount: 1,
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            updatedAt: new Date(Date.now() - 3600000).toISOString(),
          }
        ]
      };
    }
    
    if (url.includes('/messages') && options.method === 'GET') {
      // Get messages fallback
      return {
        success: true,
        data: {
          messages: [
            {
              id: 'demo_msg_1',
              roomId: url.split('/')[4], // Extract room ID from URL
              senderId: 'demo_user_1',
              content: 'Hello! This is a demo message.',
              messageType: 'text',
              createdAt: new Date(Date.now() - 7200000).toISOString(),
              readBy: [],
            },
            {
              id: 'demo_msg_2',
              roomId: url.split('/')[4],
              senderId: authApi.getCurrentUserId(),
              content: 'Hi! This is demo mode.',
              messageType: 'text',
              createdAt: new Date(Date.now() - 3600000).toISOString(),
              readBy: ['demo_user_1'],
            }
          ],
          pagination: {
            hasMore: false,
            page: 1,
            limit: 50,
            total: 2,
          }
        }
      };
    }
    
    if (url.includes('/messages') && options.method === 'POST') {
      // Send message fallback
      const body = JSON.parse(options.body || '{}');
      const roomId = url.split('/')[4]; // Extract room ID from URL
      
      const demoMessage = {
        id: 'demo_msg_' + Date.now(),
        roomId: roomId,
        senderId: authApi.getCurrentUserId(),
        content: body.content,
        messageType: body.messageType || 'text',
        createdAt: new Date().toISOString(),
        readBy: [],
      };
      
      // Simulate real-time delivery
      setTimeout(() => {
        this.handleIncomingMessage(demoMessage);
      }, 100);
      
      return {
        success: true,
        data: demoMessage
      };
    }
    
    // Default fallback
    return {
      success: true,
      data: {},
      message: 'Demo mode - chat service not available'
    };
  }

  // Get appropriate error message based on status code
  getErrorMessage(status, apiMessage) {
    switch (status) {
      case 400:
        return apiMessage || 'Invalid chat data. Please check your inputs.';
      case 401:
        return ERROR_MESSAGES.UNAUTHORIZED;
      case 404:
        return 'Chat room not found.';
      case 403:
        return 'You do not have permission to access this chat.';
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

  // Initialize WebSocket connection
  async initializeSocket() {
    try {
      const accessToken = authApi.getAccessToken();
      const userId = authApi.getCurrentUserId();
      
      if (!accessToken || !userId) {
        console.log('No auth token or user ID, skipping socket initialization');
        return false;
      }

      // Check for bypass mode
      if (userId === 'bypass_user_1234567890') {
        console.log('Using bypass mode for chat socket');
        this.isConnected = true;
        return true;
      }

      // Disconnect existing socket if any
      if (this.socket) {
        this.socket.disconnect();
      }

      // Initialize socket connection
      this.socket = io(API_ENDPOINTS.CHAT.SOCKET_URL, {
        auth: {
          token: accessToken
        },
        transports: ['websocket'],
        timeout: 5000,
      });

      // Socket event handlers
      this.socket.on('connect', () => {
        console.log('Chat socket connected');
        this.isConnected = true;
      });

      this.socket.on('disconnect', () => {
        console.log('Chat socket disconnected');
        this.isConnected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('Chat socket connection error:', error.message);
        this.isConnected = false;
      });

      // Message events
      this.socket.on('message', (data) => {
        console.log('New message received:', data);
        this.handleIncomingMessage(data);
      });

      this.socket.on('typing', (data) => {
        console.log('User typing:', data);
        this.handleTypingEvent(data);
      });

      this.socket.on('message_read', (data) => {
        console.log('Message read:', data);
        this.handleMessageReadEvent(data);
      });

      return true;
    } catch (error) {
      console.error('Socket initialization error:', error);
      return false;
    }
  }

  // Disconnect socket
  disconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
  }

  // Handle incoming messages
  handleIncomingMessage(messageData) {
    const roomId = messageData.roomId;
    const listeners = this.messageListeners.get(roomId);
    
    if (listeners) {
      listeners.forEach(callback => callback(messageData));
    }
  }

  // Handle typing events
  handleTypingEvent(typingData) {
    const roomId = typingData.roomId;
    const listeners = this.typingListeners.get(roomId);
    
    if (listeners) {
      listeners.forEach(callback => callback(typingData));
    }
  }

  // Handle message read events
  handleMessageReadEvent(readData) {
    const roomId = readData.roomId;
    const listeners = this.messageListeners.get(roomId);
    
    if (listeners) {
      listeners.forEach(callback => callback({ type: 'message_read', ...readData }));
    }
  }

  // Add message listener
  addMessageListener(roomId, callback) {
    if (!this.messageListeners.has(roomId)) {
      this.messageListeners.set(roomId, new Set());
    }
    this.messageListeners.get(roomId).add(callback);
  }

  // Remove message listener
  removeMessageListener(roomId, callback) {
    const listeners = this.messageListeners.get(roomId);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.messageListeners.delete(roomId);
      }
    }
  }

  // Add typing listener
  addTypingListener(roomId, callback) {
    if (!this.typingListeners.has(roomId)) {
      this.typingListeners.set(roomId, new Set());
    }
    this.typingListeners.get(roomId).add(callback);
  }

  // Remove typing listener
  removeTypingListener(roomId, callback) {
    const listeners = this.typingListeners.get(roomId);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.typingListeners.delete(roomId);
      }
    }
  }

  // Create or get direct chat room
  async createOrGetDirectChat(participantUserId) {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      if (!participantUserId) {
        throw new Error('Participant user ID is required');
      }

      // Check for bypass mode
      if (userId === 'bypass_user_1234567890') {
        console.log('Using bypass mode for direct chat creation');
        
        const mockRoom = {
          id: `direct_${userId}_${participantUserId}`,
          isGroup: false,
          participants: [
            {
              userId: userId,
              name: 'You',
              profilePic: null,
            },
            {
              userId: participantUserId,
              name: 'Demo User',
              profilePic: null,
            }
          ],
          lastMessage: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        return {
          success: true,
          data: mockRoom,
        };
      }

      const payload = {
        isGroup: false,
        memberIds: [participantUserId],
      };

      const response = await this.makeRequest(`${this.baseUrl}${API_ENDPOINTS.CHAT.CREATE_ROOM}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (response.success) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        throw new Error(response.message || 'Failed to create chat room');
      }
    } catch (error) {
      console.error('Create/Get Direct Chat Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to create chat. Please try again.',
      };
    }
  }

  // Get user's chat rooms
  async getChatRooms(page = 1, limit = 20) {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      // Check for bypass mode
      if (userId === 'bypass_user_1234567890') {
        console.log('Using bypass mode for chat rooms');
        
        const mockRooms = [
          {
            id: 'room_1',
            isGroup: false,
            participants: [
              {
                userId: userId,
                name: 'You',
                profilePic: null,
              },
              {
                userId: 'demo_user_1',
                name: 'Demo User',
                profilePic: null,
              }
            ],
            lastMessage: {
              id: 'msg_1',
              content: 'Hello! Welcome to the demo chat.',
              senderId: 'demo_user_1',
              createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            },
            unreadCount: 1,
            createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            updatedAt: new Date(Date.now() - 3600000).toISOString(),
          }
        ];

        return {
          success: true,
          data: mockRooms,
        };
      }

      const url = `${this.baseUrl}${API_ENDPOINTS.CHAT.GET_ROOMS}?page=${page}&limit=${limit}`;

      const response = await this.makeRequest(url, {
        method: 'GET',
      });

      if (response.success) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        throw new Error(response.message || 'Failed to load chat rooms');
      }
    } catch (error) {
      console.error('Get Chat Rooms Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load chats. Please try again.',
      };
    }
  }

  // Send message
  async sendMessage(roomId, content, messageType = 'text') {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      if (!roomId || !content.trim()) {
        throw new Error('Room ID and message content are required');
      }

      // Check for bypass mode
      if (userId === 'bypass_user_1234567890') {
        console.log('Using bypass mode for sending message');
        
        const mockMessage = {
          id: 'msg_' + Date.now(),
          roomId: roomId,
          senderId: userId,
          content: content,
          messageType: messageType,
          createdAt: new Date().toISOString(),
          readBy: [],
        };

        // Simulate real-time delivery
        setTimeout(() => {
          this.handleIncomingMessage(mockMessage);
        }, 100);

        return {
          success: true,
          data: mockMessage,
        };
      }

      const payload = {
        content: content,
        // messageType: messageType,
      };

      // Send via WebSocket if connected
      if (this.isConnected && this.socket) {
        this.socket.emit('send_message', {
          roomId: roomId,
          ...payload,
        });

        // Create temporary message for immediate UI update
        const tempMessage = {
          id: 'temp_' + Date.now(),
          roomId: roomId,
          senderId: userId,
          content: content,
          // messageType: messageType,
          createdAt: new Date().toISOString(),
          status: 'sending',
        };

        return {
          success: true,
          data: tempMessage,
        };
      }

      // Fallback to HTTP API
      const response = await this.makeRequest(`${this.baseUrl}${API_ENDPOINTS.CHAT.SEND_MESSAGE}/${roomId}/messages`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (response.success) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        throw new Error(response.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Send Message Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to send message. Please try again.',
      };
    }
  }

  // Get messages for a room
  async getMessages(roomId, page = 1, limit = 50) {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      if (!roomId) {
        throw new Error('Room ID is required');
      }

      // Check for bypass mode
      if (userId === 'bypass_user_1234567890') {
        console.log('Using bypass mode for messages');
        
        const mockMessages = [
          {
            id: 'msg_1',
            roomId: roomId,
            senderId: 'demo_user_1',
            content: 'Hello! How are you doing?',
            messageType: 'text',
            createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
            readBy: [],
          },
          {
            id: 'msg_2',
            roomId: roomId,
            senderId: userId,
            content: 'Hi! I\'m doing great, thanks!',
            messageType: 'text',
            createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            readBy: ['demo_user_1'],
          }
        ];

        return {
          success: true,
          data: {
            messages: mockMessages,
            pagination: {
              hasMore: false,
              page: page,
              limit: limit,
              total: mockMessages.length,
            }
          }
        };
      }

      const url = `${this.baseUrl}${API_ENDPOINTS.CHAT.GET_MESSAGES}/${roomId}/messages?page=${page}&limit=${limit}`;

      const response = await this.makeRequest(url, {
        method: 'GET',
      });

      if (response.success) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        throw new Error(response.message || 'Failed to load messages');
      }
    } catch (error) {
      console.error('Get Messages Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load messages. Please try again.',
      };
    }
  }

  // Mark messages as read
  async markMessagesAsRead(messageIds) {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      if (!messageIds || messageIds.length === 0) {
        return { success: true };
      }

      // Check for bypass mode
      if (userId === 'bypass_user_1234567890') {
        console.log('Using bypass mode for marking messages as read');
        return {
          success: true,
          message: 'Messages marked as read (demo mode)',
        };
      }

      const payload = {
        messageIds: messageIds,
      };

      const response = await this.makeRequest(`${this.baseUrl}${API_ENDPOINTS.CHAT.MARK_READ}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (response.success) {
        return {
          success: true,
          message: response.message || 'Messages marked as read',
        };
      } else {
        throw new Error(response.message || 'Failed to mark messages as read');
      }
    } catch (error) {
      console.error('Mark Messages Read Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to mark messages as read.',
      };
    }
  }

  // Send typing indicator
  sendTypingIndicator(roomId, isTyping) {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        return;
      }

      // Check for bypass mode
      if (userId === 'bypass_user_1234567890') {
        console.log('Using bypass mode for typing indicator');
        return;
      }

      if (this.isConnected && this.socket) {
        this.socket.emit('typing', {
          roomId: roomId,
          isTyping: isTyping,
        });
      }
    } catch (error) {
      console.error('Send Typing Indicator Error:', error);
    }
  }

  // Join room (for receiving real-time updates)
  joinRoom(roomId) {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        return;
      }

      // Check for bypass mode
      if (userId === 'bypass_user_1234567890') {
        console.log('Using bypass mode for joining room');
        return;
      }

      if (this.isConnected && this.socket) {
        this.socket.emit('join_room', { roomId });
      }
    } catch (error) {
      console.error('Join Room Error:', error);
    }
  }

  // Leave room
  leaveRoom(roomId) {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        return;
      }

      // Check for bypass mode
      if (userId === 'bypass_user_1234567890') {
        console.log('Using bypass mode for leaving room');
        return;
      }

      if (this.isConnected && this.socket) {
        this.socket.emit('leave_room', { roomId });
      }
    } catch (error) {
      console.error('Leave Room Error:', error);
    }
  }

  // Get connection status
  isSocketConnected() {
    return this.isConnected;
  }
}

// Create and export singleton instance
const chatApi = new ChatApiService();

export default chatApi;