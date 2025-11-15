import { registerRootComponent } from 'expo';
import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import App from './App';
import * as Font from 'expo-font';

function Root() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync({
        'Gilroy-Regular': require('./assets/fonts/Gilroy-Regular.ttf'),
        'Gilroy-Medium': require('./assets/fonts/Gilroy-Medium.ttf'),
        'Gilroy-SemiBold': require('./assets/fonts/Gilroy-SemiBold.ttf'),
        'Gilroy-Bold': require('./assets/fonts/Gilroy-Bold.ttf'),
        'Gilroy-Light': require('./assets/fonts/Gilroy-Light.ttf'),
        'Gilroy-Thin': require('./assets/fonts/Gilroy-Thin.ttf'),
        'Gilroy-UltraLight': require('./assets/fonts/Gilroy-UltraLight.ttf'),
        'Gilroy-ExtraBold': require('./assets/fonts/Gilroy-ExtraBold.ttf'),
        'Gilroy-Heavy': require('./assets/fonts/Gilroy-Heavy.ttf'),
        'Gilroy-Black': require('./assets/fonts/Gilroy-Black.ttf'),
      });
      setFontsLoaded(true);
    }
    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  // Set default Text style globally to Gilroy-Regular
  const defaultProps = Text.defaultProps || {};
  defaultProps.style = [defaultProps.style, { fontFamily: 'Gilroy-Regular' }];
  Text.defaultProps = defaultProps;

  return <App />;
}

registerRootComponent(Root);
