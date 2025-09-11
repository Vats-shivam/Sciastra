# React Native Integration Prompt for Sciastra Backend Services

## Context & Overview

You are an expert React Native developer tasked with integrating a comprehensive microservices backend into an existing React Native mobile application. The backend consists of 6 user-facing services (excluding admin service which has a separate web application).

## 🎯 **Primary Objective**

Integrate all user-facing backend services into the React Native application, ensuring seamless functionality while preserving existing UI components that may be for future implementation.

## 🔧 **Backend Services to Integrate**

### 1. **Auth Service** (Port 3000)
**Priority**: Critical - Must be implemented first
- OTP-based authentication system
- JWT token management (access + refresh tokens)
- Phone number based user registration/login
- Automatic token refresh mechanism

### 2. **Profile Service** (Port 3001) 
**Priority**: High - Core user functionality
- User profile creation and management
- Experience/work history management
- Skills/topics management
- Profile picture uploads via MinIO
- Pre-signed URL handling for file uploads

### 3. **Post Service** (Port 3003)
**Priority**: High - Core social functionality  
- Create posts with text, media, and topics
- Infinite scroll feed with cursor-based pagination
- Trending posts discovery
- User-specific post feeds
- Search functionality (users, posts, topics)
- Media upload and display

### 4. **Connection Service** (Port 3002)
**Priority**: Medium - Social networking features
- Send/receive connection requests
- Accept/reject friend requests
- Friends list management
- Connection status checking
- Remove connections

### 5. **Chat Service** (Port 3004)
**Priority**: Medium - Real-time messaging
- Direct messaging (1-on-1 chats)
- Group chat functionality
- Real-time message delivery
- Message history with pagination
- Media sharing in chats
- Message read status
- **Note**: Implement WebSocket connection for real-time messaging

### 6. **Events Service** (Port 3006)
**Priority**: Low - Event management features
- Browse public events
- Event registration
- User registration history
- Event search and filtering
- Registration cancellation
- Payment status tracking

## 📱 **Integration Requirements**

### **Authentication Flow**
```javascript
// Expected authentication flow
1. Phone number input screen
2. OTP verification screen  
3. Automatic token storage (AsyncStorage/SecureStore)
4. Auto-refresh token mechanism
5. Logout functionality
6. Protected route handling
```

### **API Configuration**
```javascript
// Base URLs for services
const API_CONFIG = {
  AUTH_SERVICE: 'http://localhost:3000',
  PROFILE_SERVICE: 'http://localhost:3001', 
  CONNECTION_SERVICE: 'http://localhost:3002',
  POST_SERVICE: 'http://localhost:3003',
  CHAT_SERVICE: 'http://localhost:3004',
  EVENTS_SERVICE: 'http://localhost:3006',
  // Alternative: Use API Gateway
  GATEWAY_URL: 'http://localhost:8080'
};
```

### **Required Libraries/Dependencies**
- **HTTP Client**: Axios or similar with interceptors
- **State Management**: Redux Toolkit or Zustand
- **Navigation**: React Navigation v6+
- **Storage**: AsyncStorage + Expo SecureStore
- **WebSocket**: Socket.io-client for real-time chat
- **Image Handling**: React Native Image Picker
- **File Upload**: Support for FormData and multipart uploads

## 🔐 **Authentication Integration**

### **Token Management**
```javascript
// Implement automatic token refresh
const authInterceptor = (config) => {
  const token = await getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

// Handle token expiry
const responseInterceptor = async (error) => {
  if (error.response?.status === 401) {
    await refreshToken();
    // Retry original request
  }
};
```

### **Test Credentials**
```javascript
// Use these for testing
const TEST_CREDENTIALS = {
  phoneNumber: '+1234567890',
  otp: '197941' // This OTP is currently working
};
```

## 📋 **Specific Integration Tasks**

### **Phase 1: Authentication & Profile (Week 1)**
1. Implement OTP-based login flow
2. Set up token management and storage
3. Create/update user profiles
4. Handle profile picture uploads
5. Implement automatic token refresh

### **Phase 2: Posts & Social Features (Week 2)**
1. Implement post creation with media
2. Build infinite scroll feed
3. Add search functionality
4. Implement connection requests system
5. Create user discovery features

### **Phase 3: Messaging & Events (Week 3)**
1. Set up WebSocket connection for chat
2. Implement direct messaging
3. Add group chat functionality
4. Integrate events browsing
5. Handle event registrations

## 🎨 **UI/UX Considerations**

### **Preserve Existing UI**
- **DO NOT MODIFY** UI components marked as "future implementation"
- **DO NOT REMOVE** screens/components that aren't currently connected
- **MAINTAIN** existing navigation structure
- **PRESERVE** placeholder screens and empty states

### **Adaptive UI Updates**
- If the app doesn't support certain data fields, **gracefully handle** missing data
- **Implement progressive enhancement** - show what's available, hide what's not
- **Add loading states** for all API calls
- **Handle offline scenarios** appropriately

### **Data Handling**
```javascript
// Example: Handle optional fields gracefully
const ProfileDisplay = ({ profile }) => {
  return (
    <View>
      <Text>{profile.name}</Text>
      {profile.profession && <Text>{profile.profession}</Text>}
      {profile.experiences && profile.experiences.length > 0 && (
        <ExperienceList experiences={profile.experiences} />
      )}
      {/* Don't break if new fields are added */}
    </View>
  );
};
```

## 📊 **Expected API Response Formats**

### **Authentication Response**
```json
{
  "success": true,
  "data": {
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token", 
    "userId": "uuid"
  }
}
```

### **Profile Response**
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "name": "John Doe",
    "profession": "Software Engineer",
    "profilePic": "signed-url",
    "email": "john@example.com",
    "topics": ["JavaScript", "React Native"],
    "experiences": [
      {
        "company": "Tech Corp",
        "role": "Senior Developer",
        "startDate": "2022-01-15T00:00:00.000Z",
        "endDate": "2024-06-30T00:00:00.000Z",
        "isCurrentRole": false
      }
    ]
  }
}
```

### **Posts Feed Response**
```json
{
  "success": true,
  "data": {
    "posts": [...],
    "pagination": {
      "hasMore": true,
      "nextCursor": "post-id",
      "limit": 15
    }
  }
}
```

## ⚠️ **Critical Guidelines**

### **Error Handling**
- Implement comprehensive error handling for all API calls
- Show user-friendly error messages
- Handle network connectivity issues
- Implement retry mechanisms for failed requests

### **Performance Optimization**
- Implement proper image caching
- Use lazy loading for lists
- Optimize bundle size
- Implement proper memory management

### **Security Best Practices**
- Store sensitive tokens in SecureStore
- Implement certificate pinning if needed
- Validate all user inputs
- Handle deep linking securely

### **Future-Proofing**
- Design flexible API integration that can handle new fields
- Implement feature flags for experimental features
- Structure code for easy maintenance and updates
- Document all integration points

## 🔄 **WebSocket Integration (Chat Service)**

```javascript
// Chat service requires WebSocket connection
const chatSocket = io('http://localhost:3004', {
  auth: {
    token: userAccessToken
  }
});

// Handle real-time events
chatSocket.on('message', (data) => {
  // Update chat UI in real-time
});

chatSocket.on('typing', (data) => {
  // Show typing indicators
});
```

## 📋 **Testing Strategy**

### **API Testing**
- Test all endpoints with the provided Postman collection
- Verify error scenarios (network failures, invalid tokens)
- Test with different data scenarios

### **Integration Testing**
- Test complete user flows end-to-end
- Verify token refresh works seamlessly
- Test offline/online transitions
- Validate real-time chat functionality

## 🚀 **Deployment Considerations**

### **Environment Configuration**
- Set up proper environment variables for different stages
- Configure different API endpoints for dev/staging/prod
- Implement proper logging and crash reporting

### **App Store Preparation**
- Ensure all required permissions are properly configured
- Test on both iOS and Android
- Verify deep linking works correctly
- Test push notifications if implemented

## 📝 **Implementation Checklist**

### **Pre-Integration**
- [ ] Review existing app structure and navigation
- [ ] Identify UI components marked as "future implementation"
- [ ] Set up development environment with backend services running
- [ ] Test backend services with provided Postman collection

### **Core Integration**
- [ ] Implement authentication service integration
- [ ] Set up token management and automatic refresh
- [ ] Integrate profile service with image upload
- [ ] Implement posts service with infinite scroll feed
- [ ] Add connection service for social features
- [ ] Set up chat service with WebSocket connection
- [ ] Integrate events service for event browsing

### **Post-Integration**
- [ ] Test all integrated features thoroughly
- [ ] Implement proper error handling
- [ ] Add loading states and offline handling
- [ ] Optimize performance and memory usage
- [ ] Document integration points and API usage

## 🔍 **Troubleshooting Common Issues**

### **Token Management**
- If authentication fails, verify token format and expiry
- Ensure automatic refresh is working properly
- Check if tokens are being stored securely

### **Media Upload**
- Verify pre-signed URL generation is working
- Check file permissions and formats
- Ensure proper progress indicators for uploads

### **Real-time Chat**
- Verify WebSocket connection is established
- Check if events are being properly listened to
- Ensure proper connection state management

### **API Integration**  
- Verify all API endpoints are accessible
- Check request/response formats match expectations
- Ensure proper error handling for all scenarios

---

**Final Note**: The backend is fully functional and tested. All endpoints are documented in the Postman collection. Focus on creating a seamless mobile experience while maintaining the flexibility to grow with future backend enhancements. Remember to preserve any UI elements intended for future implementation and gracefully handle any unsupported data fields.

**Success Criteria**: Users should be able to authenticate, create profiles, post content, connect with others, chat in real-time, and discover events - all through a smooth, native mobile experience.