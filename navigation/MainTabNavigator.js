import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Platform, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import screens
import HomeScreen from '../screens/Home';
import PeopleScreen from '../screens/People';
import PostCreationScreen from '../screens/PostCreation';
import EventScreen from '../screens/Event';
import ProfileScreen from '../screens/Profile';

// Import config
import colors from '../config/colors';

// Import custom icon component
import TabIcon from '../components/TabIcon';

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          setUserProfile(user);
        }
      } catch (error) {
        console.log('Error loading user profile:', error);
      }
    };
    
    loadUserProfile();
  }, []);
  
  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: Platform.OS === 'android' ? 70 + insets.bottom : 70,
          paddingBottom: Platform.OS === 'android' ? insets.bottom + 10 : 10,
          paddingTop: 10,
          position: 'absolute',
        },
        tabBarBackground: () => (
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill}>
            <LinearGradient
              colors={['rgba(10, 19, 24, 1)', 'rgba(102, 124, 137, 1)']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 10, y: 0 }}
            />
          </BlurView>
        ),
        tabBarActiveTintColor: colors.white,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: false,
        tabBarIcon: ({ focused }) => {
          let iconName;
          const isProfile = route.name === "ProfileTab";
          const iconColor = focused ? colors.button : colors.textMuted;
          const iconSize = focused ? 28 : 24;
          
          switch (route.name) {
            case "HomeTab":
              iconName = focused ? "homeClicked" : "home";
              break;
            case "PeopleTab":
              iconName = focused ? "connectionsClicked" : "connections";
              break;
            case "AddPostTab":
              iconName = "plus";
              break;
            case "EventTab":
              iconName = "events";
              break;
            case "ProfileTab":
              iconName = "profile";
              break;
            default:
              iconName = "home";
          }
          
          if (isProfile) {
            // Determine which image to show
            const hasProfilePicture = userProfile?.profilePicture || userProfile?.avatar;
            const imageSource = hasProfilePicture 
              ? { uri: userProfile.profilePicture || userProfile.avatar }
              : require('../assets/icon.png');
            
            return (
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                borderWidth: focused ? 2 : 1.5,
                borderColor: focused ? colors.button : colors.textMuted,
                overflow: 'hidden',
              }}>
                <Image 
                  source={imageSource}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </View>
            );
          }
          
          return (
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <TabIcon name={iconName} color={iconColor} size={iconSize} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ title: "Home" }}
      />
      <Tab.Screen
        name="PeopleTab"
        component={PeopleScreen}
        options={{ title: "People" }}
      />
      <Tab.Screen
        name="AddPostTab"
        component={PostCreationScreen}
        options={{ title: "Post" }}
      />
      <Tab.Screen
        name="EventTab"
        component={EventScreen}
        options={{ title: "Event" }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: "Profile" }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
