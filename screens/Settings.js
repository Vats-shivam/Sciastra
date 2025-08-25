// screens/SettingsScreen.js
import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet, Alert } from 'react-native';
import Container from '../components/Container';
import Button from '../components/Button';
import colors from '../config/colors';

const SettingsScreen = ({ navigation }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [privacyEnabled, setPrivacyEnabled] = useState(false);

  const handleLogout = () => {
    Alert.alert('Logged out', 'You have been logged out.');
    navigation.reset({
      index: 0,
      routes: [{ name: 'Welcome' }],
    });
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
