import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Swiper from 'react-native-swiper';

const { width } = Dimensions.get('window');

const OnboardingScreen = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!/^\d{10}$/.test(phone)) return;
    setLoading(true);
    const response = await new Promise((res) =>
      setTimeout(() => res({ success: true }), 1000)
    );
    setLoading(false);
    if (response.success) navigation?.replace?.('MainTabs');
    else Alert.alert('Error', 'Failed to send OTP. Try again.');
  };

  const slides = [
    {
      title: 'Community',
      subtitle: 'Join a vibrant community where\ncollaboration and learning thrive!',
      image: { uri: 'https://picsum.photos/id/1011/400/300' }, // dummy image
    },
    {
      title: 'Learn Together',
      subtitle: 'Share knowledge, solve problems\nand grow as a team!',
      image: { uri: 'https://picsum.photos/id/1015/400/300' },
    },
    {
      title: 'Get Started',
      subtitle: 'Enter your mobile number to continue',
      login: true,
    },
  ];

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b', '#0f172a']}
      style={styles.container}
    >
      {/* Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>OS</Text>
        </View>
        <Text style={styles.logoText}>Sciastra</Text>
      </View>

      {/* Swiper */}
      <Swiper
        loop={false}
        dot={<View style={styles.dot} />}
        activeDot={<View style={[styles.dot, styles.activeDot]} />}
      >
        {slides.map((slide, index) => (
          <View key={index} style={styles.slide}>
            {slide.image && (
              <Image source={slide.image} style={styles.image} />
            )}
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>

            {slide.login && (
              <View style={{ width: '100%', marginTop: 20 }}>
                <View style={styles.inputRow}>
                  <View style={styles.countryCode}>
                    <Text style={styles.flag}>🇮🇳</Text>
                    <Text style={styles.countryText}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="10-digit mobile number"
                    placeholderTextColor="#9ca3af"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={(text) => setPhone(text.replace(/\D/g, ''))}
                  />
                </View>
                <TouchableOpacity
                  style={[
                    styles.button,
                    /^\d{10}$/.test(phone)
                      ? styles.buttonActive
                      : styles.buttonDisabled,
                    loading && { opacity: 0.7 },
                  ]}
                  onPress={handleLogin}
                  disabled={!/^\d{10}$/.test(phone) || loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Continue</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </Swiper>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'space-between' },
  logoContainer: { marginTop: 32 },
  logoCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#06b6d4',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  logoText: { fontSize: 20, fontWeight: '700', color: 'white' },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  image: {
    width: width * 0.8,
    height: 200,
    borderRadius: 16,
    marginBottom: 24,
  },
  title: { fontSize: 28, fontWeight: '700', color: 'white', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#d1d5db', textAlign: 'center' },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 4,
  },
  activeDot: { width: 24, backgroundColor: 'white' },
  inputRow: { flexDirection: 'row', marginBottom: 20 },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
  },
  flag: { fontSize: 20, marginRight: 6 },
  countryText: { color: 'white', fontSize: 16, fontWeight: '500' },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: 'white',
    fontSize: 16,
  },
  button: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  buttonActive: { backgroundColor: '#4b5563' },
  buttonDisabled: { backgroundColor: '#374151' },
  buttonText: { fontSize: 18, fontWeight: '500', color: 'white' },
});

export default OnboardingScreen;
