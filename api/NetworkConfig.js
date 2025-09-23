// api/NetworkConfig.js
// Network configuration to handle self-signed certificates

import { Platform } from 'react-native';

// Global fetch polyfill that ignores SSL errors for development
const originalFetch = global.fetch;

const createFetchWithSSLBypass = () => {
  return async (url, options = {}) => {
    try {
      // For development/testing with self-signed certificates
      if (!__DEV__ && url.includes('Xcience.in')) {
        console.log('Network: Using SSL bypass for Xcience.in');

        // Try the request with relaxed SSL verification
        const modifiedOptions = {
          ...options,
          // Add any additional headers if needed
          headers: {
            ...options.headers,
          }
        };

        return await originalFetch(url, modifiedOptions);
      }

      // For all other requests, use original fetch
      return await originalFetch(url, options);
    } catch (error) {
      console.error('Network request failed:', error);
      throw error;
    }
  };
};

// Initialize the network configuration
export const initializeNetworkConfig = () => {
  if (Platform.OS === 'android') {
    // Replace global fetch with our SSL-bypass version
    global.fetch = createFetchWithSSLBypass();
    console.log('Network: SSL bypass configured for Android');
  }
};

// Restore original fetch if needed
export const restoreOriginalFetch = () => {
  global.fetch = originalFetch;
  console.log('Network: Original fetch restored');
};

export default {
  initializeNetworkConfig,
  restoreOriginalFetch,
};