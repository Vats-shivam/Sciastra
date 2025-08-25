// screens/NotificationsScreen.js
import React from 'react';
import { FlatList, Text, StyleSheet } from 'react-native';
import Container from '../components/Container';
import Card from '../components/Card';
import colors from '../config/colors';

const mockNotifications = [
  { id: '1', text: 'Alice liked your post.' },
  { id: '2', text: 'Bob commented: "Great work!"' },
  { id: '3', text: 'Charlie sent you a connection request.' },
];

const NotificationsScreen = () => (
  <Container>
    <FlatList
      data={mockNotifications}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Card style={styles.card}>
          <Text style={styles.text}>{item.text}</Text>
        </Card>
      )}
    />
  </Container>
);

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  text: { fontSize: 16, color: colors.textPrimary },
});

export default NotificationsScreen;
