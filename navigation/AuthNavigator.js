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
import AppNavigator from './AppNavigator';

const Stack = createStackNavigator();

const AuthNavigator = () => {
  const [authState, setAuthState] = useState(authManager.getAuthState());

  console.log('🧭 AuthNavigator: Component mounting/re-mounting');

  useEffect(() => {
    console.log('🧭 AuthNavigator: useEffect running - setting up auth listener');
    // Initialize auth manager
    const initializeAuth = async () => {
      try {
        await authManager.initialize();
      } catch (error) {
        console.error('AuthNavigator initialization error:', error);
      }
    };

    initializeAuth();

    // Listen for auth state changes with debugging
    const unsubscribe = authManager.addListener((newAuthState) => {
      console.log('🧭 AuthNavigator: Auth state changed, updating component state');
      console.log('🧭 AuthNavigator: New state received:', {
        isAuthenticated: newAuthState.isAuthenticated,
        isLoading: newAuthState.isLoading,
        hasUser: !!newAuthState.user,
        userName: newAuthState.user?.name,
        hasCompletedOnboarding: newAuthState.hasCompletedOnboarding
      });
      setAuthState(newAuthState);
    });

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

  console.log('🧭 AuthNavigator: RENDER at', new Date().toLocaleTimeString(), {
    renderCount: Math.random().toFixed(4), // Unique render ID
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    needsProfile: needsProfile,
    hasUser: !!authState.user,
    userName: authState.user?.name,
    userKeys: authState.user ? Object.keys(authState.user) : [],
    finalDestination: !authState.isAuthenticated ? 'Auth Flow' :
                     needsProfile ? 'ProfileSetup' : 'App'
  });

  // Add debugging for the actual rendered component
  const currentScreen = !authState.isAuthenticated ? 'Auth Flow' :
                       needsProfile ? 'ProfileSetup' : 'App';

  console.log('🧭 AuthNavigator: Will render screen:', currentScreen);

  // Create a unique key based on the navigation decision to force re-mount when needed
  const navigatorKey = `${authState.isAuthenticated ? 'auth' : 'unauth'}-${needsProfile ? 'profile' : ''}-${authState.user?.name || 'noname'}`;

  console.log('🧭 AuthNavigator: Navigator key:', navigatorKey);

  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: '#9257D2',
          background: '#0A1318',
          card: '#0A1318',
          text: '#F2F2F2',
          border: '#2e2e2e',
          notification: '#9257D2',
        },
      }}
    >
      <Stack.Navigator
        key={navigatorKey}
        screenOptions={{ headerShown: false }}
      >
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
        ) : (
          // Main app flow
          <Stack.Screen name="App" component={AppNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AuthNavigator;