// screens/ConnectionRequestsScreen.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, StyleSheet } from 'react-native';
import Container from '../components/Container';
import Card from '../components/Card';
import colors from '../config/colors';

const mockRequests = [
  { id: '1', name: 'Charlie Young' },
  { id: '2', name: 'Dana White' },
];

const ConnectionRequestsScreen = () => {
  const [requests, setRequests] = useState(mockRequests);

  const acceptRequest = id => {
    setRequests(requests.filter(req => req.id !== id));
    Alert.alert('Connection accepted');
  };

  const rejectRequest = id => {
    setRequests(requests.filter(req => req.id !== id));
    Alert.alert('Connection rejected');
  };

  return (
    <Container>
      <FlatList
        data={requests}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <View style={styles.buttons}>
              <TouchableOpacity onPress={() => acceptRequest(item.id)} style={[styles.button, styles.accept]}>
                <Text style={styles.buttonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => rejectRequest(item.id)} style={[styles.button, styles.reject]}>
                <Text style={styles.buttonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />
    </Container>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: 12, padding: 12 },
  name: { fontSize: 18, fontWeight: '600', color: colors.primary },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end' },
  button: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginLeft: 10,
    borderRadius: 6,
  },
  accept: { backgroundColor: colors.accent },
  reject: { backgroundColor: colors.secondary },
  buttonText: { color: 'white', fontWeight: 'bold' },
});

export default ConnectionRequestsScreen;
