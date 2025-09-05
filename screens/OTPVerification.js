import React, { useState, useEffect } from 'react';
import { Alert, Text } from 'react-native';
import Container from '../components/Container';
import Button from '../components/Button';
import { api } from '../api/MockApi';
import Input from '../components/Input';

const OtpVerificationScreen = ({ navigation, route }) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const phone = route.params.phone;

  const verifyOtp = async () => {
    setLoading(true);
    // Comment actual API integration
    // const response = await api.verifyOtp(sessionId, otp);
    // Mock behavior: success if OTP is "123456"
    const response = await new Promise((res) =>
      setTimeout(() => res(otp === '123456' ? { success: true } : { success: false }), 1000)
    );
    setLoading(false);
    if (response.success) {
      navigation.replace('MainTabs');
    } else {
      Alert.alert('Invalid OTP', 'Please enter the correct OTP or resend.');
    }
  };

  return (
    <Container>
      <Text style={{ marginBottom: 12 }}>Enter the 6-digit code sent to {phone}</Text>
      <Input keyboardType="numeric" maxLength={6} value={otp} onChangeText={setOtp} />
      <Button title="Verify OTP" onPress={verifyOtp} loading={loading} disabled={otp.length !== 6} />
    </Container>
  );
};

export default OtpVerificationScreen;
