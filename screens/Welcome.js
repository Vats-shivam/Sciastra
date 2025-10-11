import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Image,
  FlatList,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import colors from '../config/colors';

const { width, height } = Dimensions.get('window');

// Onboarding data
const onboardingData = [
  {
    id: '1',
    title: 'Your Community, Your Growth.',
    description: 'Connect With Peers, Discover Opportunities, And Grow Together. Engagement And Learning Like Never Been This Easy.',
    image: require('../assets/onboarding1.png'),
    isLottie: false,
  },
  {
    id: '2',
    title: 'Where Curiosity Meets Opportunity',
    description: 'Explore Workshops, Seminars, And Research Openings. Join Exclusive Webinars And Events Hosted By Mentors And Experts.',
    image: require('../assets/2.jpg'),
  },
  {
    id: '3',
    title: 'Be Seen. Be Heard. Be Remembered.',
    description: 'Share Your Insights, Share Your Work, And Create A Community That Amplifies Your Journey Starts Today.',
    image: require('../assets/3.jpg'), 
  },
];

const OnboardingScreen = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showLoginForm, setShowLoginForm] = useState(false);
  
  // Animation references
  const formSlide = useRef(new Animated.Value(width)).current; 
  const formOpacity = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  
  // no heavy entrance animation; we'll animate content per-slide if needed
  useEffect(() => {}, []);

  const goToNextSlide = () => {
    if (currentIndex < onboardingData.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      // update index after a short delay so pagination updates in sync with scroll
      setTimeout(() => setCurrentIndex(nextIndex), 300);
    } else {
      // Show login form
      setShowLoginForm(true);
      // Animate login form in from right
      Animated.parallel([
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(formSlide, {
          toValue: 0, // Move to center
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  // Handle login - navigate to Login screen
  const handleLogin = () => {
    navigation.navigate('Login');
  };

  // removed WaveComponent - simplified static layout

  // Render onboarding item
  const renderItem = ({ item }) => {
    return (
      <View style={styles.slide}>
        {/* background image / visual */}
        {item.isLottie ? (
          <LottieView
            source={item.image}
            style={styles.lottieImage}
            autoPlay
            loop
          />
        ) : (
          <Image source={item.image} style={styles.image} resizeMode="cover" />
        )}

        {/* bottom gradient area with white text */}
        <LinearGradient
          colors={['#000000', '#100717ff']}
          style={styles.bottomGradient}
        >
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </LinearGradient>
      </View>
    );
  };

  return (
    <LinearGradient
      // Main background gradient from black to deep purple
      colors={['#100717ff', '#0c0513ff']}
      style={styles.container}
    >
      {!showLoginForm ? (
        // Onboarding screens
        <View style={styles.onboardingContainer}>
          <FlatList
            ref={flatListRef}
            data={onboardingData}
            renderItem={renderItem}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEnabled={false}
            contentContainerStyle={{ paddingBottom: 240 }}
            keyExtractor={(item) => item.id}
          />
          

          
          {/* Navigation container with buttons and pagination */}
          <LinearGradient
            colors={['#0c0513ff', '#1A0033']}
            style={styles.navigationContainer}
          >
            {/* Pagination dots */}
            <View style={styles.paginationContainer}>
              {onboardingData.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    { backgroundColor: index === currentIndex ? '#8a2be2' : 'rgba(138, 43, 226, 0.2)' },
                  ]}
                />
              ))}
            </View>
            
            {/* Button container */}
            <View style={styles.buttonContainer}>
              {/* Skip button - hidden on last slide */}
              {currentIndex < onboardingData.length - 1 && (
                <TouchableOpacity 
                  style={styles.skipButton} 
                  onPress={() => {
                    // Skip to login form
                    setShowLoginForm(true);
                    // Animate login form in from right
                    Animated.parallel([
                      Animated.timing(formOpacity, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: true,
                      }),
                      Animated.timing(formSlide, {
                        toValue: 0,
                        duration: 400,
                        useNativeDriver: true,
                      }),
                    ]).start();
                  }}
                >
                  <Text style={styles.skipButtonText}>Skip</Text>
                </TouchableOpacity>
              )}
              
              {/* Next button - full width on last slide */}
              <TouchableOpacity 
                style={[styles.nextButton, currentIndex === onboardingData.length - 1 && styles.fullWidthButton]} 
                onPress={goToNextSlide}
              >
                <LinearGradient
                  colors={['#8a2be2', '#9932cc']} // Purple gradient
                  style={styles.gradientButton}
                >
                  <Text style={styles.nextButtonText}>
                    {currentIndex === onboardingData.length - 1 ? 'Get Started' : 'Next'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      ) : (
        // Login form
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%' }}
        >
          <Animated.View
            style={[
              styles.formContainer,
              {
                opacity: formOpacity,
                transform: [{ translateX: formSlide }], // Changed from translateY to translateX
              },
            ]}
          >
            <Text style={styles.logoText}>SciAstra</Text>
            <Text style={styles.formTitle}>Ready to join our community?</Text>
            
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
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
                By continuing, you agree to our Terms of Service and Privacy Policy
              </Text>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  onboardingContainer: {
    flex: 1,
    width: width,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slide: {
    width: width,
    height: height,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 0,
    overflow: 'hidden', // Ensure content doesn't overflow
  },
  lottieImage: {
    width: width,
    height: height * 0.7, // Reduced height to fit at top
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  image: {
    width: width,
    height: height * 0.7, // Reduced height to fit at top
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  waveContainer: {
    position: 'absolute',
    bottom: 170, // Position below the text container
    left: 0,
    right: 0,
    zIndex: 10,
  },
  waveSvg: {
    backgroundColor: 'transparent',
    shadowColor: '#8a2be2',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 15,
    elevation: 10,
    borderColor: 'rgba(138, 43, 226, 0.8)',
    borderWidth: 1.5,
  },
  // legacy bottom container (kept for safety) - reduced opacity
  textContainer: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 0,
    zIndex: 12,
  },
  // New top text container placed over the image/animation area
  // Bottom gradient area that holds the slide text
  bottomGradient: {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 140,
  paddingHorizontal: 20,
  paddingTop: 20,
  paddingBottom: 30,
  alignItems: 'flex-start',
  justifyContent: 'center',
  zIndex: 15,
  backgroundColor: 'transparent',
  },
  titleTop: {
    // kept for compatibility but will not be used visually
    display: 'none'
  },
  descriptionTop: {
    display: 'none'
  },
  title: {
  fontSize: 24,
  fontWeight: '700',
  color: 'white',
  textAlign: 'left',
  marginBottom: 8,
  },
  description: {
  fontSize: 14,
  color: 'rgba(255,255,255,0.9)',
  textAlign: 'left',
  lineHeight: 20,
  },
  navigationContainer: {
  position: 'absolute',
  bottom: 30,
  left: 0,
  right: 0,
  paddingHorizontal: 20,
  zIndex: 20,
  flexDirection: 'column',
  alignItems: 'center',
  paddingBottom: 24,
  paddingTop: 12,
  backgroundColor: 'transparent',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  buttonContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '90%',
  },
  skipButton: {
    padding: 15,
  },
  skipButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '500',
  },
  nextButton: {
    overflow: 'hidden',
    borderRadius: 25,
    width: width * 0.3,
  },
  fullWidthButton: {
    width: '100%',
    alignSelf: 'center',
  },
  gradientButton: {
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 25,
    width: '100%',
    elevation: 3,
    shadowColor: '#8a2be2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  logoText: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: 'white',
    marginBottom: 30,
    textAlign: 'center',
  },
  formContainer: {
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 20,
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
  flag: { fontSize: 20, marginRight: 6 },
  countryText: { color: 'white', fontSize: 16, fontWeight: '500' },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: 'white',
    fontSize: 16,
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
  buttonActive: { opacity: 1 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 18, fontWeight: '600', color: 'white' },
  termsContainer: {
    marginTop: 25,
    paddingHorizontal: 20,
  },
  termsText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default OnboardingScreen;
