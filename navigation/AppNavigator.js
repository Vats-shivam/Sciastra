import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import navigators
import MainTabNavigator from './MainTabNavigator';

// Import screens
import ChatListScreen from '../screens/ChatList';
import OneToOneChatScreen from '../screens/OneToOne';
import ConnectionRequestsScreen from '../screens/ConnectionRequests';
import PostDetailScreen from '../screens/Post';
import SettingsScreen from '../screens/Settings';
import UserProfileScreen from '../screens/UserProfile';
import EventDetailScreen from '../screens/EventDetail';
import EventRegister from '../screens/EventRegister';
import EventPayment from '../screens/EventPayment';
import RegisteredEvents from '../screens/RegisteredEvents';
import EditProfileScreen from '../screens/EditProfile';
import NotificationsScreen from '../screens/Notification';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Main app tabs */}
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      
      {/* Chat screens */}
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen name="OneToOneChat" component={OneToOneChatScreen} />
      
      {/* Social screens */}
      <Stack.Screen name="ConnectionRequests" component={ConnectionRequestsScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      
      {/* Profile screens */}
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      
      {/* Event screens */}
      <Stack.Screen name="EventDetail" component={EventDetailScreen} />
      <Stack.Screen name="EventRegister" component={EventRegister} />
      <Stack.Screen name="EventPayment" component={EventPayment} />
      <Stack.Screen name="RegisteredEvents" component={RegisteredEvents} />
    </Stack.Navigator>
  );
};

export default AppNavigator;