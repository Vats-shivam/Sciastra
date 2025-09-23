// screens/SettingsScreen.js
import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import Container from '../components/Container';
import Button from '../components/Button';
import colors from '../config/colors';
import authManager from '../services/AuthManager';
import { useNotification } from '../contexts/NotificationContext';

const SettingsScreen = ({ navigation }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [privacyEnabled, setPrivacyEnabled] = useState(false);
  const { showError, showSuccess } = useNotification();

  const handleLogout = async () => {
    try {
      await authManager.logout();
      showSuccess('Logged out successfully');
      // AuthNavigator will automatically handle the navigation
      // based on the auth state change
    } catch (error) {
      showError('Failed to logout. Please try again.');
    }
  };

  return (
    <Container>
      <View style={styles.settingRow}>
        <Text style={styles.label}>Notifications</Text>
        <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} />
      </View>
      <View style={styles.settingRow}>
        <Text style={styles.label}>Private Account</Text>
        <Switch value={privacyEnabled} onValueChange={setPrivacyEnabled} />
      </View>

      <Button title="Logout" buttonColor={colors.accent} onPress={handleLogout} />
    </Container>
  );
};

const styles = StyleSheet.create({
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomColor: colors.textSecondary,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: 16,
    color: colors.textPrimary,
  },
});

export default SettingsScreen;
