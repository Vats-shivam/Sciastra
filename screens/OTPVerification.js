import React, { useState, useEffect } from 'react';
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
import colors from '../config/colors';
import authManager from '../services/AuthManager';
import authApi from '../api/AuthApi';

const OtpVerificationScreen = ({ navigation, route }) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const phone = route.params?.phone;
  
  console.log('OTP Screen loaded with phone:', phone);

  const verifyOtp = async () => {
    setLoading(true);
    
    try {
      const result = await authManager.login(phone, otp);
      
      if (result.success) {
        console.log('OTP verified successfully, user authenticated');
        
        // AuthManager will automatically handle navigation through AuthNavigator
        // based on the auth state (profile setup needed, onboarding needed, or main app)
        // The navigation is handled by the AuthNavigator component
        
      } else {
        setLoading(false);
        Alert.alert('Invalid OTP', result.message || 'Please enter the correct OTP or try again.');
      }
    } catch (error) {
      setLoading(false);
      console.error('OTP verification error:', error);
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
    }
  };

  const resendOtp = async () => {
    setResendLoading(true);
    
    try {
      const response = await authApi.sendOtp(phone);
      setResendLoading(false);
      
      if (response.success) {
        Alert.alert('Success', 'OTP has been resent to your phone number.');
        // Clear current OTP input
        setOtp('');
      } else {
        Alert.alert('Error', response.message || 'Failed to resend OTP. Please try again.');
      }
    } catch (error) {
      setResendLoading(false);
      console.error('Resend OTP error:', error);
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
    }
  };

  const isValidOtp = otp.length === 6;

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
          {/* Header Section */}
          <View style={styles.headerContainer}>
            <Text style={styles.logoText}>SciAstra</Text>
            <Text style={styles.title}>Verify Your Number</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to{'\n'}
              <Text style={styles.phoneNumber}>+91 {phone}</Text>
            </Text>
          </View>

          {/* OTP Input Section */}
          <View style={styles.formContainer}>
            <View style={styles.otpContainer}>
              {[...Array(6)].map((_, index) => (
                <TextInput
                  key={index}
                  style={[
                    styles.otpInput,
                    otp.length > index && styles.otpInputActive,
                  ]}
                  value={otp[index] || ''}
                  onChangeText={(text) => {
                    if (text.length <= 1 && /^\d*$/.test(text)) {
                      const newOtp = otp.split('');
                      newOtp[index] = text;
                      setOtp(newOtp.join('').slice(0, 6));
                    }
                  }}
                  onKeyPress={({ nativeEvent }) => {
                    if (nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
                      const newOtp = otp.split('');
                      newOtp[index - 1] = '';
                      setOtp(newOtp.join(''));
                    }
                  }}
                  keyboardType="numeric"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            {/* Verify Button */}
            <TouchableOpacity
              style={[
                styles.button,
                isValidOtp && styles.buttonActive,
                loading && { opacity: 0.7 },
              ]}
              onPress={verifyOtp}
              disabled={!isValidOtp || loading}
            >
              <LinearGradient
                colors={isValidOtp ? ['#8a2be2', '#9932cc'] : ['rgba(138, 43, 226, 0.3)', 'rgba(153, 50, 204, 0.3)']}
                style={styles.gradientButton}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Verify OTP</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Bypass Hint for Testing */}
            {phone === '+919999999999' && (
              <View style={styles.bypassHint}>
                <Text style={styles.bypassText}>
                  🔧 Test Mode: Use OTP "123456" for bypass
                </Text>
              </View>
            )}

            {/* Resend Section */}
            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive the code?</Text>
              <TouchableOpacity onPress={resendOtp} disabled={resendLoading}>
                {resendLoading ? (
                  <ActivityIndicator size="small" color="#8a2be2" />
                ) : (
                  <Text style={styles.resendLink}>Resend OTP</Text>
                )}
              </TouchableOpacity>
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
  headerContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 30,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },
  phoneNumber: {
    color: '#8a2be2',
    fontWeight: '600',
  },
  formContainer: {
    width: '100%',
    alignItems: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginHorizontal: 3,
  },
  otpInputActive: {
    borderColor: '#8a2be2',
    backgroundColor: 'rgba(138, 43, 226, 0.1)',
  },
  button: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
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
  resendContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  resendText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 5,
  },
  resendLink: {
    color: '#8a2be2',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  bypassHint: {
    backgroundColor: 'rgba(138, 43, 226, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 15,
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

export default OtpVerificationScreen;
