// For iOS simulator, use localhost
// For physical device, use your computer's IP address
const getBaseUrl = (port) => {
  // For Android Emulator, use 10.0.2.2 which maps to localhost on the host machine
  return `http://10.255.221.1:${port}`;
  
  // Alternative configurations:
  // For iOS Simulator or web: return `http://localhost:${port}`;
  // For physical device: return `http://YOUR_COMPUTER_IP:${port}`;
};

export const API_ENDPOINTS = {
  // Auth Service - Port 3000
  AUTH: {
    BASE_URL: getBaseUrl(3000),
    SEND_OTP: '/auth/send-otp',
    VERIFY_OTP: '/auth/verify-otp',
    REFRESH_TOKEN: '/auth/refresh-token',
    LOGOUT: '/auth/logout',
    HEALTH: '/',
  },
  
  // Profile Service - Port 3001
  PROFILE: {
    BASE_URL: getBaseUrl(3001),
    CREATE_UPDATE: '/profile',
    GET_BY_ID: '/profile',
    UPDATE: '/profile',
    UPLOAD_URL: '/profile/upload-url',
    HEALTH: '/',
  },
  
  // Connection Service - Port 3002
  CONNECTION: {
    BASE_URL: getBaseUrl(3002),
    SEND_REQUEST: '/connections/request',
    ACCEPT_REQUEST: '/connections/accept',
    REJECT_REQUEST: '/connections/reject',
    GET_SENT: '/connections/sent',
    GET_RECEIVED: '/connections/received',
    GET_FRIENDS: '/connections/friends',
    REMOVE: '/connections',
    GET_STATUS: '/connections/status',
    HEALTH: '/',
  },
  
  // Post Service - Port 3003
  POST: {
    BASE_URL: getBaseUrl(3003),
    CREATE: '/posts',
    GET_BY_ID: '/posts',
    GET_USER_POSTS: '/posts/user',
    SEARCH_USERS: '/search/users',
    SEARCH_POSTS: '/search/posts',
    SEARCH_TOPICS: '/search/topics',
  },
  
  // Chat Service - Port 3004
  CHAT: {
    BASE_URL: getBaseUrl(3004),
    CREATE_ROOM: '/chat/rooms',
    GET_ROOMS: '/chat/rooms',
    GET_ROOM: '/chat/rooms',
    UPDATE_ROOM: '/chat/rooms',
    ADD_MEMBERS: '/chat/rooms',
    REMOVE_MEMBER: '/chat/rooms',
    SEND_MESSAGE: '/chat/rooms',
    GET_MESSAGES: '/chat/rooms',
    MARK_READ: '/chat/messages',
    HEALTH: '/',
  },
};

// Request timeout configuration
export const REQUEST_CONFIG = {
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
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
