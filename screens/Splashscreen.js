import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import useScreenApiLogger from '../hooks/useScreenApiLogger';

const SplashScreen = ({ navigation }) => {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useScreenApiLogger('Splashscreen');

  useEffect(() => {
    // Logo animation
    Animated.sequence([
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate after 2s
    const timer = setTimeout(() => navigation.replace('Welcome'), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b', '#0f172a']} // dark slate gradient
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.logoWrapper,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <Image source={require('../assets/icon.png')} style={styles.logo} />
        <Text style={styles.appName}>SCIX</Text>
      </Animated.View>

      {/* Subtle pulsing loader */}
      <Animated.View
        style={[
          styles.pulseDot,
          {
            opacity: opacityAnim,
          },
        ]}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrapper: {
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 12,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 1,
  },
  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22d3ee', // cyan-400
    marginTop: 40,
  },
});

export default SplashScreen;
