import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import authManager from '../services/AuthManager';

// Import screens
import SplashScreen from '../screens/Splashscreen';
import WelcomeScreen from '../screens/Welcome';
import LoginScreen from '../screens/Login';
import OtpVerificationScreen from '../screens/OTPVerification';
import ProfileSetupScreen from '../screens/ProfileSetup';
import SuggestedConnectionsScreen from '../screens/SuggestedConnection';
import AppNavigator from './AppNavigator';

const Stack = createStackNavigator();

const AuthNavigator = () => {
  const [authState, setAuthState] = useState(authManager.getAuthState());

  useEffect(() => {
    // Initialize auth manager
    const initializeAuth = async () => {
      try {
        await authManager.initialize();
      } catch (error) {
        console.error('AuthNavigator initialization error:', error);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const unsubscribe = authManager.addListener(setAuthState);

    return unsubscribe;
  }, []);

  // Show splash screen while loading
  if (authState.isLoading) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  const needsProfile = authState.isAuthenticated && authManager.needsProfileSetup();
  const needsOnboarding = authState.isAuthenticated && authManager.needsOnboarding();
  
  console.log('🧭 AuthNavigator: Navigation decision:', {
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    needsProfile: needsProfile,
    needsOnboarding: needsOnboarding,
    hasUser: !!authState.user,
    userName: authState.user?.name
  });

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!authState.isAuthenticated ? (
          // Authentication flow
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
          </>
        ) : needsProfile ? (
          // Profile setup flow
          <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        ) : needsOnboarding ? (
          // Onboarding flow
          <Stack.Screen name="SuggestedConnections" component={SuggestedConnectionsScreen} />
        ) : (
          // Main app flow
          <Stack.Screen name="App" component={AppNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AuthNavigator;