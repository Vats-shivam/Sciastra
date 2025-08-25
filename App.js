import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

import SplashScreen from "./screens/Splashscreen";
import WelcomeScreen from "./screens/Welcome";
import LoginScreen from "./screens/Login";
import OtpVerificationScreen from "./screens/OTPVerification";
import ProfileSetupScreen from "./screens/ProfileSetup";
import SuggestedConnectionsScreen from "./screens/SuggestedConnection";
import ChatListScreen from "./screens/ChatList";
import OneToOneChatScreen from "./screens/OneToOne";

import HomeScreen from "./screens/Home";
import PeopleScreen from "./screens/People";
import PostCreationScreen from "./screens/PostCreation";
import NotificationsScreen from "./screens/Notification";
import ProfileScreen from "./screens/Profile";
import PostDetailScreen from "./screens/Post";
import SettingsScreen from "./screens/Settings";
import colors from "./config/colors";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();



function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.backgroundSecondary, // ✅ Dark background
          borderTopColor: colors.border, // ✅ Subtle border
        },
        tabBarActiveTintColor: colors.primary,   // ✅ Cyan for active
        tabBarInactiveTintColor: colors.textMuted, // ✅ Muted gray for inactive
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          switch (route.name) {
            case "HomeTab":
              iconName = focused ? "home" : "home-outline";
              break;
            case "PeopleTab":
              iconName = focused
                ? "account-multiple"
                : "account-multiple-outline";
              break;
            case "AddPostTab":
              iconName = focused ? "plus-circle" : "plus-circle-outline";
              break;
            case "NotificationsTab":
              iconName = focused ? "bell" : "bell-outline";
              break;
            case "ProfileTab":
              iconName = focused ? "account" : "account-outline";
              break;
            default:
              iconName = "circle";
          }
          return <Icon name={iconName} size={size} color={color} />;
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
        name="NotificationsTab"
        component={NotificationsScreen}
        options={{ title: "Alerts" }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: "Profile" }}
      />
    </Tab.Navigator>
  );
}



export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        <Stack.Screen name="SuggestedConnections" component={SuggestedConnectionsScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="ChatList" component={ChatListScreen} />
        <Stack.Screen name="OneToOneChat" component={OneToOneChatScreen} />
        <Stack.Screen name="PostDetail" component={PostDetailScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="UserProfile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
