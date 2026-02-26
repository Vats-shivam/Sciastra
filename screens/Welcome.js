import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import useScreenApiLogger from '../hooks/useScreenApiLogger';
import { Linking } from 'react-native';
import { PRIVACY_POLICY_URL, TERMS_AND_CONDITIONS_URL } from '../config/legalConfig';

const WelcomeScreen = ({ navigation }) => {
  useScreenApiLogger('Welcome');

  const handleGetStarted = () => {
    navigation.navigate('Login');
  };

  return (
    <LinearGradient
      colors={['#100717ff', '#0c0513ff']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.formContainer}>
          <Image source={require('../assets/welcomescix.png')} style={styles.logoImage} resizeMode="contain" />
          <Text style={styles.formTitle}>STEM community by SciAstra</Text>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleGetStarted}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#8a2be2', '#9932cc']}
              style={styles.gradientLoginButton}
            >
              <Text style={styles.buttonText}>Get Started</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By continuing, you agree to our{' '}
              <Text style={styles.linkText} onPress={() => Linking.openURL(TERMS_AND_CONDITIONS_URL)}>
                Terms of Service
              </Text>{' '}
              and{' '}
              <Text style={styles.linkText} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
                Privacy Policy
              </Text>.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    width: '100%',
  },
  formContainer: {
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  logoImage: {
    width: 220,
    height: 80,
    marginBottom: 30,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '300',
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
  },
  loginButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
  },
  gradientLoginButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  termsContainer: {
    marginTop: 25,
    paddingHorizontal: 20,
  },
  termsText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    textAlign: 'center',
  },
  linkText: {
    color: '#9ecbff',
    textDecorationLine: 'underline',
  },
});

export default WelcomeScreen;
