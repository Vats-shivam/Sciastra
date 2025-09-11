import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Import screens
import HomeScreen from '../screens/Home';
import PeopleScreen from '../screens/People';
import PostCreationScreen from '../screens/PostCreation';
import EventScreen from '../screens/Event';
import ProfileScreen from '../screens/Profile';

// Import config
import colors from '../config/colors';

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.backgroundSecondary,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.white,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          const isProfile = route.name === "ProfileTab";
          
          switch (route.name) {
            case "HomeTab":
              iconName = "home-variant";
              break;
            case "PeopleTab":
              iconName = "account-group";
              break;
            case "AddPostTab":
              iconName = "plus-circle";
              break;
            case "EventTab":
              iconName = "calendar";
              break;
            case "ProfileTab":
              iconName = "account-circle";
              break;
            default:
              iconName = "circle";
          }
          
          if (isProfile) {
            return (
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: focused ? colors.button : 'transparent',
                borderWidth: focused ? 2 : 0,
                borderColor: focused ? colors.button : 'transparent',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Icon 
                  name={iconName} 
                  size={24} 
                  color={focused ? colors.white : colors.textMuted} 
                />
              </View>
            );
          }
          
          return (
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: focused ? colors.button : 'transparent',
              borderWidth: focused ? 2 : 0,
              borderColor: focused ? colors.button : 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Icon 
                name={iconName} 
                size={24} 
                color={focused ? colors.white : colors.textMuted} 
              />
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