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
import Svg, { Path, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
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
    image: require('../assets/onboarding1.png'),
  },
  {
    id: '3',
    title: 'Be Seen. Be Heard. Be Remembered.',
    description: 'Share Your Insights, Share Your Work, And Create A Community That Amplifies Your Journey Starts Today.',
    image: require('../assets/onboarding1.png'), 
  },
];

const OnboardingScreen = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showLoginForm, setShowLoginForm] = useState(false);
  
  // Animation references
  const slideAnim = useRef(new Animated.Value(0)).current; 
  const formSlide = useRef(new Animated.Value(width)).current; 
  const formOpacity = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  
  // Set initial animation when component mounts
  useEffect(() => {
    // Ensure first slide is visible
    slideAnim.setValue(0);
  }, []);

  // Go to next slide or show login form
  const goToNextSlide = () => {
    if (currentIndex < onboardingData.length - 1) {
      // Slide current slide to the left
      Animated.timing(slideAnim, {
        toValue: -width, // Move to left (negative width)
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Move to next slide
        setCurrentIndex(currentIndex + 1);
        // Reset animation position
        slideAnim.setValue(width); // Start from right
        // Scroll FlatList to next slide
        flatListRef.current?.scrollToIndex({
          index: currentIndex + 1,
          animated: false, // We're handling animation manually
        });
        // Slide in from right
        Animated.timing(slideAnim, {
          toValue: 0, // Move to center
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
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

  // Wave component for the transition effect
  const WaveComponent = () => {
    const waveAnim = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, {
            toValue: 1,
            duration: 4000,
            useNativeDriver: true,
          }),
          Animated.timing(waveAnim, {
            toValue: 0,
            duration: 4000,
            useNativeDriver: true,
          })
        ])
      ).start();
    }, []);
    
    const translateX = waveAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -30]
    });
    
    return (
      <View style={styles.waveContainer}>
        <Animated.View style={{ transform: [{ translateX }] }}>
          <Svg height="100" width={width + 30} viewBox={`0 0 ${width + 30} 100`} style={styles.waveSvg}>
            <SvgLinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="rgba(30, 0, 60, 0.95)" />
              <Stop offset="0.5" stopColor="rgba(13, 0, 32, 0.98)" />
              <Stop offset="1" stopColor="rgba(0, 0, 0, 0.99)" />
            </SvgLinearGradient>
            <Path
              d={`M0 40 Q${width/8} 10 ${width/4} 30 T${width/2} 15 T${width*3/4} 35 T${width} 20 T${width + 30} 40 V100 H0 Z`}
              fill="url(#grad)"
            />
          </Svg>
        </Animated.View>
      </View>
    );
  };

  // Render onboarding item
  const renderItem = ({ item }) => {
    return (
      <Animated.View 
        style={[
          styles.slide, 
          { transform: [{ translateX: slideAnim }] }
        ]}
      >
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
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
        <WaveComponent />
      </Animated.View>
    );
  };

  return (
    <LinearGradient
      colors={['#000000', '#0d0020', '#000000']} // Mostly black with hints of purple
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
            keyExtractor={(item) => item.id}
          />
          

          
          {/* Navigation container with buttons and pagination */}
          <View style={styles.navigationContainer}>
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
          </View>
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
  textContainer: {
    position: 'absolute',
    bottom: 250,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.92)', // More opaque black background
    paddingTop: 25,
    paddingBottom: 35,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(138, 43, 226, 0.6)', // More visible purple border at bottom
    zIndex: 15 // Ensure it's above the image but below the wave
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'left',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'left',
    lineHeight: 22,
  },
  navigationContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    zIndex: 20, // Ensure it's above the wave
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
    width: '100%',
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
