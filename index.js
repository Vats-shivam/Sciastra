import { registerRootComponent } from 'expo';
import React from 'react';
import { Text } from 'react-native';
import App from './App';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold, Poppins_500Medium } from '@expo-google-fonts/poppins';

function Root() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  // Set default Text style globally
  const defaultProps = Text.defaultProps || {};
  defaultProps.style = [defaultProps.style, { fontFamily: 'Poppins_400Regular' }];
  Text.defaultProps = defaultProps;

  return <App />;
}

registerRootComponent(Root);
