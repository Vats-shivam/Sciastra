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
import apiLogger from '../services/ApiLogger';

class ChatApiService {
  constructor() {
    this.baseUrl = getApiBaseUrl('chat');
    this.socket = null;
    this.isConnected = false;
    this.messageListeners = new Map();
    this.typingListeners = new Map();
    this.statusListeners = new Map(); // Add status listeners
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

        const method = (config.method || 'GET').toUpperCase();
        apiLogger.logApiCall(url, method);

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
          console.error('Chat API Request Error:', error);
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


      // Disconnect existing socket if any
      if (this.socket) {
        this.socket.disconnect();
      }

      // Initialize socket connection - Note: /chat path for nginx routing
      const socketUrl = `${API_ENDPOINTS.CHAT.SOCKET_URL}/chat`;
      console.log('ChatApi: Connecting to socket URL:', socketUrl);

      this.socket = io(socketUrl, {
    auth: { token: accessToken },
    transports: ['websocket', 'polling'],
    path: '/socket.io/',
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
        console.log('Chat service may not be running.');
        this.isConnected = false;
      });

      this.socket.on('reconnect_failed', () => {
        console.log('Chat socket reconnection failed. Using offline mode.');
        this.isConnected = false;
      });

      // New message events (updated to match backend specs)
      this.socket.on('new:message', (data) => {
        console.log('🔥 NEW MESSAGE EVENT RECEIVED:', data);
        console.log('🔥 Message content:', data.content);
        console.log('🔥 Message sender:', data.sender);
        console.log('🔥 Message room:', data.chatRoomId);
        this.handleIncomingMessage(data);
      });

      // Room events
      this.socket.on('joined:room', (data) => {
        console.log('Joined room:', data);
      });

      this.socket.on('left:room', (data) => {
        console.log('Left room:', data);
      });

      // Typing events
      this.socket.on('user:typing', (data) => {
        console.log('User typing:', data);
        this.handleTypingEvent(data);
      });

      // Message read events
      this.socket.on('message:read', (data) => {
        console.log('Message read:', data);
        this.handleMessageReadEvent(data);
      });

      // User status events
      this.socket.on('user:online', (data) => {
        console.log('User online:', data);
        this.handleUserStatusEvent({ ...data, status: 'online' });
      });

      this.socket.on('user:offline', (data) => {
        console.log('User offline:', data);
        this.handleUserStatusEvent({ ...data, status: 'offline' });
      });

      // Notifications
      this.socket.on('notification', (data) => {
        console.log('Notification received:', data);
        this.handleNotificationEvent(data);
      });

      // Error handling
      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
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
    const roomId = messageData.chatRoomId || messageData.roomId;
    console.log('🔥 HANDLING MESSAGE FOR ROOM:', roomId);
    console.log('🔥 AVAILABLE LISTENERS:', Array.from(this.messageListeners.keys()));

    const listeners = this.messageListeners.get(roomId);

    if (listeners) {
      console.log('🔥 FOUND LISTENERS, CALLING CALLBACKS:', listeners.size);
      listeners.forEach(callback => callback(messageData));
    } else {
      console.log('🔥 NO LISTENERS FOUND FOR ROOM:', roomId);
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

  // Handle user status events
  handleUserStatusEvent(statusData) {
    console.log('User status changed:', statusData);
    const userId = statusData.userId;
    const listeners = this.statusListeners.get(userId);
    
    if (listeners) {
      listeners.forEach(callback => callback(statusData));
    }
  }

  // Handle notification events
  handleNotificationEvent(notificationData) {
    console.log('Notification received:', notificationData);
    // You can add listeners for notifications if needed
  }

  // Add message listener
  addMessageListener(roomId, callback) {
    if (!this.messageListeners.has(roomId)) {
      this.messageListeners.set(roomId, new Set());
    }

    const listeners = this.messageListeners.get(roomId);

    // Remove any existing identical callback to prevent duplicates
    listeners.delete(callback);

    // Add the callback
    listeners.add(callback);

    console.log(`📝 Added message listener for room ${roomId}. Total listeners: ${listeners.size}`);
  }

  // Remove message listener
  removeMessageListener(roomId, callback) {
    const listeners = this.messageListeners.get(roomId);
    if (listeners) {
      const removed = listeners.delete(callback);
      console.log(`🗑️ Removed message listener for room ${roomId}. Success: ${removed}. Remaining: ${listeners.size}`);

      if (listeners.size === 0) {
        this.messageListeners.delete(roomId);
        console.log(`🗑️ Removed all listeners for room ${roomId}`);
      }
    } else {
      console.log(`🗑️ No listeners found for room ${roomId}`);
    }
  }

  // Add typing listener
  addTypingListener(roomId, callback) {
    if (!this.typingListeners.has(roomId)) {
      this.typingListeners.set(roomId, new Set());
    }

    const listeners = this.typingListeners.get(roomId);

    // Remove any existing identical callback to prevent duplicates
    listeners.delete(callback);

    // Add the callback
    listeners.add(callback);

    console.log(`⌨️ Added typing listener for room ${roomId}. Total listeners: ${listeners.size}`);
  }

  // Remove typing listener
  removeTypingListener(roomId, callback) {
    const listeners = this.typingListeners.get(roomId);
    if (listeners) {
      const removed = listeners.delete(callback);
      console.log(`🗑️ Removed typing listener for room ${roomId}. Success: ${removed}. Remaining: ${listeners.size}`);

      if (listeners.size === 0) {
        this.typingListeners.delete(roomId);
        console.log(`🗑️ Removed all typing listeners for room ${roomId}`);
      }
    } else {
      console.log(`🗑️ No typing listeners found for room ${roomId}`);
    }
  }

  // Add status listener for a specific user
  addStatusListener(userId, callback) {
    if (!this.statusListeners.has(userId)) {
      this.statusListeners.set(userId, new Set());
    }

    const listeners = this.statusListeners.get(userId);

    // Remove any existing identical callback to prevent duplicates
    listeners.delete(callback);

    // Add the callback
    listeners.add(callback);

    console.log(`👤 Added status listener for user ${userId}. Total listeners: ${listeners.size}`);
  }

  // Remove status listener for a specific user
  removeStatusListener(userId, callback) {
    const listeners = this.statusListeners.get(userId);
    if (listeners) {
      const removed = listeners.delete(callback);
      console.log(`🗑️ Removed status listener for user ${userId}. Success: ${removed}. Remaining: ${listeners.size}`);

      if (listeners.size === 0) {
        this.statusListeners.delete(userId);
        console.log(`🗑️ Removed all status listeners for user ${userId}`);
      }
    } else {
      console.log(`🗑️ No status listeners found for user ${userId}`);
    }
  }

  // Clear all listeners for a room
  clearRoomListeners(roomId) {
    const messageListeners = this.messageListeners.get(roomId);
    const typingListeners = this.typingListeners.get(roomId);

    if (messageListeners) {
      this.messageListeners.delete(roomId);
      console.log(`🧹 Cleared ${messageListeners.size} message listeners for room ${roomId}`);
    }

    if (typingListeners) {
      this.typingListeners.delete(roomId);
      console.log(`🧹 Cleared ${typingListeners.size} typing listeners for room ${roomId}`);
    }
  }

  // Find or create direct chat room (prevents duplicates)
  async createOrGetDirectChat(participantUserId) {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      if (!participantUserId) {
        throw new Error('Participant user ID is required');
      }

      // Use the new find-or-create endpoint to prevent duplicates
      const response = await this.makeRequest(`${this.baseUrl}/chat/chat/rooms/find/${participantUserId}`, {
        method: 'GET',
      });
      console.log('ChatApi',response);
      if (response.success) {
        console.log('ChatApi: Find-or-create result:', response.message || 'Room found/created');
        return {
          success: true,
          data: response.data,
        };
      } else {
        throw new Error(response.message || 'Failed to find or create chat room');
      }
    } catch (error) {
      console.error('Create/Get Direct Chat Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to create/get chat room. Please try again.',
      };
    }
  }

  // Create group chat room
  async createGroupChat(memberIds, groupName) {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      if (!memberIds || memberIds.length === 0) {
        throw new Error('Member IDs are required for group chat');
      }


      const payload = {
        isGroup: true,
        memberIds: memberIds,
        name: groupName,
      };

      const response = await this.makeRequest(`${this.baseUrl}/chat/chat/rooms`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (response.success) {
        console.log('ChatApi: Group chat created successfully');
        return {
          success: true,
          data: response.data,
        };
      } else {
        throw new Error(response.message || 'Failed to create group chat');
      }
    } catch (error) {
      console.error('Create Group Chat Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to create group chat. Please try again.',
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


      const url = `${this.baseUrl}/chat/chat/rooms?page=${page}&limit=${limit}`;

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


      const payload = {
        content: content,
        // messageType: messageType,
      };

      // Send via WebSocket if connected
      if (this.isConnected && this.socket) {
        console.log('🚀 SENDING MESSAGE VIA WEBSOCKET:', {
          roomId: roomId,
          content: content,
          media: payload.media,
        });
        this.socket.emit('send:message', {
          roomId: roomId,
          content: content,
          media: payload.media, // optional media attachment
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
      const response = await this.makeRequest(`${this.baseUrl}/chat/chat/rooms/${roomId}/messages`, {
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


      const url = `${this.baseUrl}/chat/chat/rooms/${roomId}/messages?page=${page}&limit=${limit}`;

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


      // For now, mark each message individually as the backend expects single message ID
      // This could be optimized to support bulk operations if the backend supports it
      const promises = messageIds.map(messageId =>
        this.makeRequest(`${this.baseUrl}/chat/messages/${messageId}/read`, {
          method: 'PUT',
        })
      );

      const responses = await Promise.all(promises);

      // Check if all responses are successful
      const allSuccessful = responses.every(response => response.success);

      if (allSuccessful) {
        return {
          success: true,
          message: 'Messages marked as read',
        };
      } else {
        throw new Error('Failed to mark some messages as read');
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


      if (this.isConnected && this.socket) {
        if (isTyping) {
          this.socket.emit('typing:start', { roomId });
        } else {
          this.socket.emit('typing:stop', { roomId });
        }
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


      if (this.isConnected && this.socket) {
        console.log('🏠 JOINING ROOM VIA WEBSOCKET:', roomId);
        this.socket.emit('join:room', { roomId });
      } else {
        console.log('🚨 CANNOT JOIN ROOM - NOT CONNECTED:', {
          isConnected: this.isConnected,
          hasSocket: !!this.socket
        });
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


      if (this.isConnected && this.socket) {
        this.socket.emit('leave:room', { roomId });
      }
    } catch (error) {
      console.error('Leave Room Error:', error);
    }
  }

  // Get connection status
  isSocketConnected() {
    return this.isConnected;
  }

  // Mark message as read via WebSocket
  markMessageAsReadViaSocket(messageId, roomId) {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        return;
      }


      if (this.isConnected && this.socket) {
        this.socket.emit('mark:read', {
          messageId: messageId,
          roomId: roomId,
        });
      }
    } catch (error) {
      console.error('Mark Message as Read via Socket Error:', error);
    }
  }

  // Get current user ID
  getCurrentUserId() {
    return authApi.getCurrentUserId();
  }

  // Media Upload Methods

  // Get presigned URL for media upload
  async getMediaUploadUrl(fileName, fileType, roomId) {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      const payload = {
        fileName: fileName,
        fileType: fileType, // e.g., 'image/jpeg', 'image/png', 'video/mp4'
        roomId: roomId
      };

      const response = await this.makeRequest(`${this.baseUrl}/chat/chat/media/upload-url`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (response.success) {
        console.log('🔍 FULL UPLOAD URL RESPONSE:', JSON.stringify(response.data, null, 2));

        // Validate the upload URL
        if (!response.data.uploadUrl || response.data.uploadUrl.length < 50) {
          console.error('🚨 INVALID UPLOAD URL:', response.data.uploadUrl);
          throw new Error('Invalid upload URL received from server');
        }

        return {
          success: true,
          data: response.data, // { uploadUrl, mediaKey, expiresIn: 300 }
        };
      } else {
        throw new Error(response.message || 'Failed to get upload URL');
      }
    } catch (error) {
      console.error('Get Media Upload URL Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get upload URL. Please try again.',
      };
    }
  }

  // Upload file directly to S3 using presigned URL
  async uploadMediaFile(uploadUrl, fileUri, fileType) {
    try {
      console.log('🚀 UPLOADING TO S3:', {
        uploadUrl: uploadUrl,
        fileUri: fileUri,
        fileType: fileType
      });

      // Read the file as blob/binary data for S3 upload
      const fileResponse = await fetch(fileUri);
      const fileBlob = await fileResponse.blob();

      console.log('🚀 FILE BLOB INFO:', {
        size: fileBlob.size,
        type: fileBlob.type
      });

      // Try different upload methods based on the URL structure
      let response;

      // Check if this looks like a proper presigned URL
      if (uploadUrl.includes('?')) {
        console.log('🚀 Using presigned URL upload with PUT');
        // Standard presigned URL upload
        response = await fetch(uploadUrl, {
          method: 'PUT',
          body: fileBlob,
          headers: {
            'Content-Type': fileType,
          },
        });
      } else {
        console.log('🚀 Using FormData upload with POST');
        // Fallback to FormData POST (some S3 configurations use this)
        const formData = new FormData();
        formData.append('file', {
          uri: fileUri,
          type: fileType,
          name: `upload.${fileType.split('/')[1]}`
        });

        response = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
          headers: {
            // Don't set Content-Type for FormData, let browser set it with boundary
          },
        });
      }

      console.log('🚀 S3 UPLOAD RESPONSE:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      // Log response body for debugging
      if (!response.ok) {
        const responseText = await response.text();
        console.log('🚀 S3 ERROR RESPONSE:', responseText);
      }

      return response.ok;
    } catch (error) {
      console.error('Upload Media File Error:', error);
      console.error('Upload error details:', {
        message: error.message,
        stack: error.stack
      });
      return false;
    }
  }

  // Send message with media attachment
  async sendMediaMessage(roomId, content, mediaKey, mediaType, fileName, fileType) {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      if (!roomId || !mediaKey) {
        throw new Error('Room ID and media key are required');
      }

      const mediaObject = {
        key: mediaKey,           // S3 key for the uploaded file
        type: mediaType,         // 'image' or 'video'
        mimeType: fileType,      // 'image/jpeg', 'video/mp4', etc.
        fileName: fileName,
        uploadedAt: new Date().toISOString()
      };

      const payload = {
        content: content || '', // Optional text with media
        media: mediaObject
      };

      // Send via WebSocket if connected
      if (this.isConnected && this.socket) {
        console.log('🚀 SENDING MEDIA MESSAGE VIA WEBSOCKET:', {
          roomId: roomId,
          content: content,
          media: mediaObject,
        });

        this.socket.emit('send:message', {
          roomId: roomId,
          content: content || '',
          media: mediaObject
        });

        // Create temporary message for immediate UI update
        const tempMessage = {
          id: 'temp_' + Date.now(),
          roomId: roomId,
          senderId: userId,
          content: content || '',
          media: mediaObject,
          createdAt: new Date().toISOString(),
          status: 'sending',
        };

        return {
          success: true,
          data: tempMessage,
        };
      }

      // Fallback to HTTP API
      const response = await this.makeRequest(`${this.baseUrl}/chat/chat/rooms/${roomId}/messages`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (response.success) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        throw new Error(response.message || 'Failed to send media message');
      }
    } catch (error) {
      console.error('Send Media Message Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to send media message. Please try again.',
      };
    }
  }

  // Alternative upload method - direct to backend
  async uploadMediaDirect(roomId, imageUri, fileType) {
    try {
      const fileName = imageUri.split('/').pop();

      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: fileType,
        name: fileName
      });
      formData.append('roomId', roomId);

      // Don't set Content-Type for FormData - let the browser set it with proper boundary
      const response = await this.makeRequest(`${this.baseUrl}/chat/chat/media/upload`, {
        method: 'POST',
        body: formData,
        // Remove Content-Type header to let FormData set it properly with boundary
      });

      return response;
    } catch (error) {
      console.error('Direct upload error:', error);
      return { success: false, message: error.message };
    }
  }

  // Complete flow: Select media → Upload → Send message
  async sendImageMessage(roomId, imageUri, caption = '') {
    try {
      // Step 1: Get file info
      const fileName = imageUri.split('/').pop();
      const fileType = this.getFileTypeFromUri(imageUri);

      // Step 2: Try presigned URL upload first
      try {
        const uploadResult = await this.getMediaUploadUrl(fileName, fileType, roomId);

        if (uploadResult.success) {
          // Step 3: Upload to S3
          const uploadSuccess = await this.uploadMediaFile(
            uploadResult.data.uploadUrl,
            imageUri,
            fileType
          );

          if (uploadSuccess) {
            // Step 4: Send message with media
            const messageResult = await this.sendMediaMessage(
              roomId,
              caption,
              uploadResult.data.mediaKey,
              'image',
              fileName,
              fileType
            );

            return messageResult;
          } else {
            console.log('🔄 Presigned upload failed, trying direct upload...');
          }
        }
      } catch (presignedError) {
        console.log('🔄 Presigned URL method failed, trying direct upload...', presignedError.message);
      }

      // Fallback: Direct upload to backend
      console.log('🚀 Using direct upload fallback');
      const directUploadResult = await this.uploadMediaDirect(roomId, imageUri, fileType);

      if (directUploadResult.success) {
        // If direct upload includes the complete message, return it
        if (directUploadResult.data.message) {
          console.log('🎯 Upload returned complete message:', directUploadResult.data.message);

          // Simulate the message being received
          setTimeout(() => {
            this.handleIncomingMessage(directUploadResult.data.message);
          }, 100);

          return {
            success: true,
            data: directUploadResult.data.message
          };
        }

        // Otherwise, send the message with the uploaded media key
        return await this.sendMediaMessage(
          roomId,
          caption,
          directUploadResult.data.mediaKey,
          'image',
          fileName,
          fileType
        );
      } else {
        throw new Error(directUploadResult.message || 'All upload methods failed');
      }

    } catch (error) {
      console.error('Error sending image message:', error);
      return {
        success: false,
        message: error.message || 'Failed to send image. Please try again.',
      };
    }
  }

  // Complete flow: Select video → Upload → Send message
  async sendVideoMessage(roomId, videoUri, caption = '') {
    try {
      // Step 1: Get file info
      const fileName = videoUri.split('/').pop();
      const fileType = this.getFileTypeFromUri(videoUri);

      // Step 2: Get upload URL
      const uploadResult = await this.getMediaUploadUrl(fileName, fileType, roomId);
      if (!uploadResult.success) {
        throw new Error(uploadResult.message);
      }

      // Step 3: Upload to S3
      const uploadSuccess = await this.uploadMediaFile(
        uploadResult.data.uploadUrl,
        videoUri,
        fileType
      );

      if (!uploadSuccess) {
        throw new Error('Failed to upload media');
      }

      // Step 4: Send message with media
      const messageResult = await this.sendMediaMessage(
        roomId,
        caption,
        uploadResult.data.mediaKey,
        'video',
        fileName,
        fileType
      );

      return messageResult;
    } catch (error) {
      console.error('Error sending video message:', error);
      return {
        success: false,
        message: error.message || 'Failed to send video. Please try again.',
      };
    }
  }

  // Helper method to determine file type from URI
  getFileTypeFromUri(uri) {
    const extension = uri.split('.').pop().toLowerCase();
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
      'avi': 'video/avi',
      'm4v': 'video/mp4',
      'mkv': 'video/x-matroska'
    };
    return mimeTypes[extension] || 'image/jpeg';
  }

  // Get media display URL for rendering in chat
  getMediaDisplayUrl(mediaKey) {
    // Use the proxy endpoint instead of direct S3 URL
    return `${this.baseUrl}/chat/chat/media/proxy?key=${encodeURIComponent(mediaKey)}`;
  }

  // Helper method to get image source with headers
  getImageSource(mediaKey, userToken) {
    return {
      uri: this.getMediaDisplayUrl(mediaKey),
      headers: {
        'Authorization': `Bearer ${userToken}`,
      },
    };
  }
}

// Create and export singleton instance
const chatApi = new ChatApiService();

export default chatApi;