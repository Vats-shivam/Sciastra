import React, { useState, useEffect, useRef } from 'react';
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
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../config/colors';
import authManager from '../services/AuthManager';
import authApi from '../api/AuthApi';
import { useNotification } from '../contexts/NotificationContext';
import useScreenApiLogger from '../hooks/useScreenApiLogger';

const OtpVerificationScreen = ({ navigation, route }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [smsListener, setSmsListener] = useState(null);
  const [timer, setTimer] = useState(30);
  const [isTimerActive, setIsTimerActive] = useState(true);
  const phone = route.params?.phone;
  const { showSuccess, showError } = useNotification();

  useScreenApiLogger('OTPVerification');

  // Create refs for each input
  const inputRefs = useRef([]);
  const isAutoFilling = useRef(false);

  // Start timer function
  const startTimer = () => {
    setTimer(30);
    setIsTimerActive(true);
  };

  useEffect(() => {
    // Initialize refs
    inputRefs.current = inputRefs.current.slice(0, 6);

    // Set up SMS auto-detection
    setupSmsListener();

    // Start timer on mount (after first OTP is sent)
    startTimer();

    // Clean up on unmount
    return () => {
      if (smsListener) {
        clearInterval(smsListener);
      }
    };
  }, []);

  // Timer effect
  useEffect(() => {
    let interval = null;
    if (isTimerActive) {
      interval = setInterval(() => {
        setTimer((prevTimer) => {
          if (prevTimer <= 1) {
            setIsTimerActive(false);
            return 0;
          }
          return prevTimer - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isTimerActive]);

  // Auto-detect OTP from SMS/Clipboard
  const setupSmsListener = () => {
    const checkClipboard = async () => {
      try {
        const clipboardContent = await Clipboard.getString();
        const otpMatch = clipboardContent.match(/\b\d{6}\b/);

        if (otpMatch && !isAutoFilling.current) {
          const detectedOtp = otpMatch[0];
          if (detectedOtp !== otp.join('')) {
            isAutoFilling.current = true;
            autoFillOTP(detectedOtp);
            showSuccess('OTP detected and filled automatically!');

            // Clear clipboard to prevent re-triggering
            setTimeout(() => {
              Clipboard.setString('');
              isAutoFilling.current = false;
            }, 1000);
          }
        }
      } catch (error) {
        // Ignore clipboard errors
      }
    };

    // Check clipboard every 2 seconds
    const interval = setInterval(checkClipboard, 2000);
    setSmsListener(interval);
  };

  // Auto-fill OTP function
  const autoFillOTP = (otpString) => {
    const otpArray = otpString.split('').slice(0, 6);
    while (otpArray.length < 6) {
      otpArray.push('');
    }
    setOtp(otpArray);

    // Focus the last filled input or next empty one
    const nextEmptyIndex = otpArray.findIndex(val => val === '');
    const targetIndex = nextEmptyIndex === -1 ? 5 : Math.max(0, nextEmptyIndex - 1);

    setTimeout(() => {
      inputRefs.current[targetIndex]?.focus();
    }, 100);
  };

  // Handle input change with auto-increment
  const handleInputChange = (text, index) => {
    if (isAutoFilling.current) return;

    // Handle paste - check if multiple digits are pasted
    if (text.length > 1) {
      const digits = text.replace(/\D/g, '').slice(0, 6);
      autoFillOTP(digits.padEnd(6, ''));
      return;
    }

    // Only allow single digit
    if (text.length <= 1 && /^\d*$/.test(text)) {
      const newOtp = [...otp];
      newOtp[index] = text;
      setOtp(newOtp);

      // Auto-move to next input
      if (text && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  // Handle backspace with auto-decrement
  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        // If current box is empty, move to previous and clear it
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      } else if (otp[index]) {
        // If current box has value, just clear it
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    }
  };

  // Handle input focus
  const handleInputFocus = (index) => {
    // If user taps on an input that's not the next expected one, focus appropriately
    const firstEmptyIndex = otp.findIndex(val => val === '');
    if (firstEmptyIndex !== -1 && index > firstEmptyIndex) {
      inputRefs.current[firstEmptyIndex]?.focus();
    }
  };

  const verifyOtp = async () => {
    setLoading(true);
    const otpString = otp.join('');
    
    try {
      const result = await authManager.login(phone, otpString);

      if (result.success) {
        showSuccess('OTP verified successfully!');

        // AuthManager will automatically handle navigation through AuthNavigator
        // based on the auth state (profile setup needed, onboarding needed, or main app)
        // The navigation is handled by the AuthNavigator component

      } else {
        setLoading(false);
        showError(result.message || 'Please enter the correct OTP or try again.');
      }
    } catch (error) {
      setLoading(false);
      showError('Network error. Please check your connection and try again.');
    }
  };

  const resendOtp = async () => {
    if (isTimerActive || timer > 0) {
      return; // Prevent resend if timer is active
    }

    setResendLoading(true);
    
    try {
      const response = await authApi.sendOtp(phone);
      setResendLoading(false);
      
      if (response.success) {
        showSuccess('OTP has been resent to your phone number.');
        // Clear current OTP input
        setOtp(['', '', '', '', '', '']);
        // Start timer after successful resend
        startTimer();
        // Focus first input
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 100);
      } else {
        showError(response.message || 'Failed to resend OTP. Please try again.');
      }
    } catch (error) {
      setResendLoading(false);
      showError('Network error. Please check your connection and try again.');
    }
  };

  const isValidOtp = otp.join('').length === 6;

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
            <Text style={styles.logoText}>SciX</Text>
            <Text style={styles.title}>Verify Your Number</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to{'\n'}
              <Text style={styles.phoneNumber}>{phone}</Text>
            </Text>
          </View>

          {/* OTP Input Section */}
          <View style={styles.formContainer}>
            <Text style={styles.otpHint}>
              OTP will be auto-detected from SMS 📱
            </Text>
            <View style={styles.otpContainer}>
              {[...Array(6)].map((_, index) => (
                <TextInput
                  key={index}
                  ref={el => inputRefs.current[index] = el}
                  style={[
                    styles.otpInput,
                    otp[index] ,
                    // Highlight the current input position
                    !otp[index] && otp.findIndex(val => val === '') === index && styles.otpInputFocused,
                  ]}
                  value={otp[index] || ''}
                  onChangeText={(text) => handleInputChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  onFocus={() => handleInputFocus(index)}
                  keyboardType="numeric"
                  maxLength={6} // Allow paste of full OTP
                  selectTextOnFocus
                  autoComplete="sms-otp"
                  textContentType="oneTimeCode"
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
            {/* {phone === '9999999999' && (
              <View style={styles.bypassHint}>
                <Text style={styles.bypassText}>
                  🔧 Test Mode: Use OTP "123456" for bypass
                </Text>
                <TouchableOpacity
                  style={styles.fillTestOtpButton}
                  onPress={() => autoFillOTP('123456')}
                >
                  <Text style={styles.fillTestOtpText}>Fill Test OTP</Text>
                </TouchableOpacity>
              </View>
            )} */}

            {/* Resend Section */}
            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive the code?</Text>
              {isTimerActive && timer > 0 ? (
                <Text style={styles.timerText}>
                  Resend OTP in {timer}s
                </Text>
              ) : (
                <TouchableOpacity 
                  onPress={resendOtp} 
                  disabled={resendLoading || isTimerActive}
                >
                  {resendLoading ? (
                    <ActivityIndicator size="small" color="#8a2be2" />
                  ) : (
                    <Text style={styles.resendLink}>Resend OTP</Text>
                  )}
                </TouchableOpacity>
              )}
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
  otpHint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
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
    backgroundColor: 'rgba(138, 43, 226, 0.2)',
    shadowColor: '#8a2be2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  otpInputFocused: {
    borderColor: '#ff6b6b',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    transform: [{ scale: 1.05 }],
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
  timerText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '500',
  },
  bypassHint: {
    backgroundColor: 'rgba(138, 43, 226, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(138, 43, 226, 0.3)',
    alignItems: 'center',
  },
  bypassText: {
    color: '#8a2be2',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },
  fillTestOtpButton: {
    backgroundColor: '#8a2be2',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  fillTestOtpText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default OtpVerificationScreen;
