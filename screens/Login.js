import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import colors from '../config/colors';
import authApi from '../api/AuthApi';

const LoginScreen = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    // Validate phone number using AuthApi
    const phoneValidation = authApi.validatePhoneNumber(phone);
    if (!phoneValidation.isValid) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.sendOtp(phoneValidation.formatted);
      
      setLoading(false);
      
      if (response.success) {
        console.log('OTP sent successfully to phone:', phoneValidation.formatted);
        navigation.navigate('OtpVerification', { phone: phoneValidation.formatted });
      } else {
        Alert.alert('Error', response.message || 'Failed to send OTP. Please try again.');
      }
    } catch (error) {
      setLoading(false);
      console.error('Login error:', error);
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
    }
  };

  const isValidPhone = authApi.validatePhoneNumber(phone).isValid;

  return (
    <LinearGradient
      colors={['#000000', '#0d0020', '#000000']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
        <View style={styles.content}>
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>SciAstra</Text>
            <Text style={styles.subtitle}>
              Join a vibrant community where{'\n'}
              collaboration and learning thrive!
            </Text>
          </View>

          {/* Phone Input Section */}
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Enter your mobile number</Text>
            
            <View style={styles.inputRow}>
              <View style={styles.countryCode}>
                <Text style={styles.flag}>🇮🇳</Text>
                <Text style={styles.countryText}>+91</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="10-digit mobile number"
                placeholderTextColor="rgba(255,255,255,0.5)"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={(text) => setPhone(text.replace(/\D/g, ''))}
              />
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              style={[
                styles.button,
                isValidPhone && styles.buttonActive,
                loading && { opacity: 0.7 },
              ]}
              onPress={handleLogin}
              disabled={!isValidPhone || loading}
            >
              <LinearGradient
                colors={isValidPhone ? ['#8a2be2', '#9932cc'] : ['rgba(138, 43, 226, 0.3)', 'rgba(153, 50, 204, 0.3)']}
                style={styles.gradientButton}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Continue</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Bypass Hint for Testing */}
            <View style={styles.bypassHint}>
              <Text style={styles.bypassText}>
                🔧 Test Mode: Use phone "9999999999" for bypass authentication
              </Text>
            </View>

            {/* Terms */}
            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                By continuing, you agree to our Terms of Service and Privacy Policy
              </Text>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },
  formContainer: {
    width: '100%',
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 25,
    width: '100%',
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginRight: 8,
  },
  flag: {
    fontSize: 20,
    marginRight: 6,
  },
  countryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: 'white',
    fontSize: 16,
  },
  button: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
  },
  buttonActive: {
    opacity: 1,
  },
  gradientButton: {
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
  bypassHint: {
    backgroundColor: 'rgba(138, 43, 226, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(138, 43, 226, 0.3)',
  },
  bypassText: {
    color: '#8a2be2',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default LoginScreen;
