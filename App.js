import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View } from "react-native";
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
import UserProfileScreen from "./screens/UserProfile";
import PostDetailScreen from "./screens/Post";
import SettingsScreen from "./screens/Settings";
import colors from "./config/colors";
import EventScreen from "./screens/Event";
import EventDetailScreen from "./screens/EventDetail";
import EventRegister from "./screens/EventRegister";
import EventPayment from "./screens/EventPayment";
import RegisteredEvents from "./screens/RegisteredEvents";
import EditProfileScreen from "./screens/EditProfile";
import { LoaderProvider } from "./context/LoaderContext";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();



function MainTabs() {
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
}



export default function App() {
  return (
    <LoaderProvider>
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
          <Stack.Screen name="UserProfile" component={UserProfileScreen} />
          <Stack.Screen name="EventDetail" component={EventDetailScreen} />
          <Stack.Screen name="EventRegister" component={EventRegister} />
          <Stack.Screen name="EventPayment" component={EventPayment} />
          <Stack.Screen name="RegisteredEvents" component={RegisteredEvents} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </LoaderProvider>
  );
}
