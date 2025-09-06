# Sciastra Authentication Integration

This document outlines the authentication system integration with the Sciastra Backend API.

## Overview

The authentication system has been integrated with the real Sciastra Backend API endpoints for OTP-based phone number authentication. The system includes:

- **Send OTP**: Sends OTP to user's phone number
- **Verify OTP**: Verifies the OTP and returns authentication tokens
- **Token Management**: Secure storage and automatic refresh of access tokens
- **Error Handling**: Comprehensive error handling with user-friendly messages

## API Endpoints Used

### Auth Service (Port 3000)
- `POST /auth/send-otp` - Send OTP to phone number
- `POST /auth/verify-otp` - Verify OTP and get tokens
- `POST /auth/refresh-token` - Refresh access token
- `POST /auth/logout` - Logout and invalidate tokens

## Files Modified/Created

### New Files
1. **`/api/AuthApi.js`** - Main authentication service with API integration
2. **`/config/apiConfig.js`** - Centralized API configuration and constants

### Modified Files
1. **`/screens/Login.js`** - Integrated with Send OTP API
2. **`/screens/OTPVerification.js`** - Integrated with Verify OTP API

## Features Implemented

### 1. Authentication Service (`AuthApi.js`)
- **Token Management**: Secure storage using AsyncStorage
- **Automatic Token Refresh**: Handles token expiration automatically
- **Request Retry Logic**: Retries failed requests with exponential backoff
- **Phone Number Validation**: Validates Indian phone numbers
- **Error Handling**: Comprehensive error handling with appropriate messages

### 2. Login Screen (`Login.js`)
- **Real API Integration**: Calls the actual Send OTP endpoint
- **Phone Validation**: Uses improved validation from AuthApi
- **Error Feedback**: Shows appropriate error messages to users
- **Loading States**: Proper loading indicators during API calls

### 3. OTP Verification Screen (`OTPVerification.js`)
- **Real API Integration**: Calls the actual Verify OTP endpoint
- **Token Storage**: Automatically stores authentication tokens
- **Resend OTP**: Functional resend OTP with loading states
- **Error Handling**: Proper error messages for invalid OTP

## Configuration

### API Base URLs
Update the base URLs in `/config/apiConfig.js` to match your backend deployment:

```javascript
export const API_ENDPOINTS = {
  AUTH: {
    BASE_URL: 'http://localhost:3000', // Update for production
    // ... other endpoints
  },
  // ... other services
};
```

### Environment Setup
For production deployment, update the `getApiBaseUrl` function to use production URLs:

```javascript
export const getApiBaseUrl = (service) => {
  const isProduction = __DEV__ === false;
  if (isProduction) {
    return `https://api.sciastra.com/${service}`;
  }
  // ... development URLs
};
```

## Authentication Flow

1. **User enters phone number** → Login screen validates format
2. **Send OTP API call** → Backend sends OTP to phone
3. **User enters OTP** → OTP verification screen validates input
4. **Verify OTP API call** → Backend validates OTP and returns tokens
5. **Token storage** → Tokens stored securely in AsyncStorage
6. **Navigation** → User navigated to next screen (ProfileSetup)

## Token Management

### Storage
- **Access Token**: Short-lived token for API authentication
- **Refresh Token**: Long-lived token for refreshing access tokens
- **User ID**: Stored for user identification

### Automatic Refresh
- Access tokens are automatically refreshed when expired
- Failed refresh attempts clear all tokens and require re-login
- Retry logic prevents infinite loops

## Error Handling

### Network Errors
- Connection timeouts (10 seconds)
- Retry logic with exponential backoff
- User-friendly error messages

### API Errors
- Invalid phone numbers
- Invalid/expired OTP
- Rate limiting
- Server errors

### User Feedback
- Loading indicators during API calls
- Alert dialogs for errors
- Success messages for OTP resend

## Security Features

1. **Secure Token Storage**: Uses AsyncStorage with proper key naming
2. **Automatic Token Refresh**: Prevents token expiration issues
3. **Request Timeout**: Prevents hanging requests
4. **Phone Number Validation**: Ensures proper format before API calls
5. **Error Sanitization**: Prevents sensitive information exposure

## Testing

### Local Development
1. Ensure backend services are running on specified ports
2. Update API base URLs in configuration
3. Test with valid Indian phone numbers (starting with 6-9)
4. Use OTP "123456" for testing (if backend supports test mode)

### Production Testing
1. Update API URLs to production endpoints
2. Test with real phone numbers
3. Verify OTP delivery through SMS
4. Test error scenarios (network issues, invalid OTP, etc.)

## Dependencies Added

- `@react-native-async-storage/async-storage` - For secure token storage

## Next Steps

1. **Profile Integration**: Integrate profile creation/update APIs
2. **Connection Management**: Implement connection request APIs
3. **Post Management**: Integrate post creation and feed APIs
4. **Chat Integration**: Implement real-time chat functionality
5. **Push Notifications**: Add push notification support for OTP

## Troubleshooting

### Common Issues

1. **Network Errors**: Check if backend services are running
2. **Invalid Phone Format**: Ensure 10-digit Indian numbers
3. **OTP Not Received**: Check backend SMS configuration
4. **Token Issues**: Clear app data to reset stored tokens

### Debug Mode
Enable console logging to debug API calls:
```javascript
console.log('API Request:', url, options);
console.log('API Response:', response);
```

## API Response Formats

### Send OTP Response
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

### Verify OTP Response
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "ace6c2d9775b247cefe70e4431ee1d1d...",
    "userId": "351a5e3b-6f19-48fb-9c55-58e556f0d037"
  }
}
```

This integration provides a robust, secure, and user-friendly authentication system that's ready for production use.
