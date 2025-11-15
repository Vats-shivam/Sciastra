// API Configuration according to MOBILE_INTEGRATION_PROMPT.md
const getBaseUrl = (port) => {
  // Environment detection
  const isProduction = !__DEV__;

  // Production API URL - Temporarily use HTTP due to self-signed SSL certificate
  // const PRODUCTION_URL = "https://Xcience.in";
  const PRODUCTION_URL = "https://4261b2bf4cc6.ngrok-free.app";

  // Development URLs
  const DEVELOPMENT_URL = "http://Xcience.in"; // Use HTTP for both environments

  // Use the same URL for both environments for now
  return PRODUCTION_URL;

  // Alternative configurations for different environments:
  // For local development: return `http://localhost:${port}`;
  // For Android Emulator: return `http://10.0.2.2:${port}`;
  // For physical device: return `http://YOUR_COMPUTER_IP:${port}`;
  // For production: return PRODUCTION_URL;
};

export const API_ENDPOINTS = {
  // Auth Service - Port 3000 (nginx routes /auth/ -> auth-service:3000/)
  AUTH: {
    BASE_URL: getBaseUrl(3000),
    SEND_OTP: '/auth/auth/send-otp',
    VERIFY_OTP: '/auth/auth/verify-otp',
    REFRESH_TOKEN: '/auth/auth/refresh-token',
    LOGOUT: '/auth/auth/logout',
    HEALTH: '/auth/auth',
  },

  // Profile Service - Port 3001 (nginx routes /profile/ -> profile-service:3001/)
  PROFILE: {
    BASE_URL: getBaseUrl(3001),
    CREATE_UPDATE: '/profile/profile',
    GET_BY_ID: '/profile/profile',
    UPDATE: '/profile/profile',
    UPLOAD_URL: '/profile/profile/upload-url',
    HEALTH: '/profile/profile/health',
  },

  // Connection Service - Port 3002 (nginx routes /connection/ -> connection-service:3002/)
  CONNECTION: {
    BASE_URL: getBaseUrl(3002),
    SEND_REQUEST: '/connection/connections/request',
    ACCEPT_REQUEST: '/connection/connections/accept',
    REJECT_REQUEST: '/connection/connections/reject',
    GET_SENT: '/connection/connections/sent',
    GET_RECEIVED: '/connection/connections/received',
    GET_FRIENDS: '/connection/connections/friends',
    REMOVE: '/connection/connections',
    GET_STATUS: '/connection/connections/status',
    HEALTH: '/connection/connections/health',
  },

  // Post Service - Port 3003 (nginx routes /post/ -> post-service:3003/)
  POST: {
    BASE_URL: getBaseUrl(3003),
    CREATE: '/post/posts',
    GET_BY_ID: '/post/posts',
    GET_FEED: '/post/posts/feed',
    GET_TRENDING: '/post/posts/trending',
    GET_USER_POSTS: '/post/posts/user',
    SEARCH_USERS: '/post/search/users',
    SEARCH_POSTS: '/post/posts/search/posts',
    SEARCH_TOPICS: '/post/search/topics',
    UPLOAD_MEDIA: '/post/posts/upload',
    HEALTH: '/post/posts/health',
  },

  // Chat Service - Port 3004 (nginx routes /chat/ -> chat-service:3004/)
  CHAT: {
    BASE_URL: getBaseUrl(3004),
    CREATE_ROOM: '/chat/chat/rooms',
    GET_ROOMS: '/chat/chat/rooms',
    GET_ROOM: '/chat/chat/rooms',
    UPDATE_ROOM: '/chat/chat/rooms',
    ADD_MEMBERS: '/chat/chat/rooms',
    REMOVE_MEMBER: '/chat/chat/rooms',
    SEND_MESSAGE: '/chat/chat/rooms',
    GET_MESSAGES: '/chat/chat/rooms',
    MARK_READ: '/chat/chat/messages',
    HEALTH: '/chat/chat/',
    // WebSocket endpoints
    SOCKET_URL: getBaseUrl(3004),
  },

  // Events Service - Port 3006 (nginx routes /events/ -> events-service:3006/)
  EVENTS: {
    BASE_URL: getBaseUrl(3006),
    // Event Discovery
    GET_ALL: '/events/events',
    GET_FEATURED: '/events/events/featured',
    GET_UPCOMING: '/events/events/upcoming',
    GET_BY_CATEGORY: '/events/events/category',
    GET_BY_ID: '/events/events',
    SEARCH: '/events/events/search',
    GET_STATS: '/events/events/stats',
    // Registration
    REGISTER: '/events/registrations/events',
    GET_REGISTERED: '/events/registrations',
    GET_REGISTRATION_BY_ID: '/events/registrations',
    CANCEL_REGISTRATION: '/events/registrations',
    GET_REGISTRATION_STATS: '/events/registrations/stats',
    // Payment
    GET_PAYMENT_STATUS: '/events/payments/registration',
    GET_PAYMENT_HISTORY: '/events/payments/history',
    RETRY_PAYMENT: '/events/payments/registration',
    HEALTH: '/events/events/health',
  },
};

// Request timeout configuration
export const REQUEST_CONFIG = {
  TIMEOUT: 30000, // 30 seconds for profile operations
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY: 2000, // 2 seconds
};

// Storage keys for AsyncStorage
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'sciastra_access_token',
  REFRESH_TOKEN: 'sciastra_refresh_token',
  USER_ID: 'sciastra_user_id',
  USER_PROFILE: 'sciastra_user_profile',
  ONBOARDING_COMPLETED: 'sciastra_onboarding_completed',
};

// Environment-specific configurations
export const getApiBaseUrl = (service) => {
  // In production, you might want to use different URLs
  // const isProduction = __DEV__ === false;
  // if (isProduction) {
  //   return `https://api.sciastra.com/${service}`;
  // }

  switch (service) {
    case 'auth':
      return API_ENDPOINTS.AUTH.BASE_URL;
    case 'profile':
      return API_ENDPOINTS.PROFILE.BASE_URL;
    case 'connection':
      return API_ENDPOINTS.CONNECTION.BASE_URL;
    case 'post':
      return API_ENDPOINTS.POST.BASE_URL;
    case 'chat':
      return API_ENDPOINTS.CHAT.BASE_URL;
    case 'events':
      return API_ENDPOINTS.EVENTS.BASE_URL;
    default:
      throw new Error(`Unknown service: ${service}`);
  }
};

// Common headers for API requests
export const getCommonHeaders = (includeAuth = true, accessToken = null) => {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (includeAuth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  // Add debug info for production builds
  if (!__DEV__) {
    console.log('API Base URL:', getBaseUrl());
    console.log('Using HTTPS:', getBaseUrl().startsWith('https'));
  }

  return headers;
};

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your internet connection.',
  TIMEOUT_ERROR: 'Request timeout. Please try again.',
  UNAUTHORIZED: 'Session expired. Please login again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  INVALID_OTP: 'Invalid OTP. Please enter the correct code.',
  OTP_EXPIRED: 'OTP has expired. Please request a new one.',
  PHONE_INVALID: 'Please enter a valid phone number.',
  GENERIC_ERROR: 'Something went wrong. Please try again.',
};
