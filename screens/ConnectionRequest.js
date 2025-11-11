// screens/ConnectionRequestsScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import Container from '../components/Container';
import Card from '../components/Card';
import colors from '../config/colors';
import ConnectionApi from '../api/ConnectionApi';
import useScreenApiLogger from '../hooks/useScreenApiLogger';

const ConnectionRequestsScreen = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useScreenApiLogger('ConnectionRequests');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const result = await ConnectionApi.getReceivedRequests(1, 50);

      if (result.success) {
        const pendingRequests = (result.data.connections || []).filter(req => req.status === 'PENDING');
        const formattedRequests = pendingRequests.map(req => ({
          id: req.user?.id || req.id,
          connectionId: req.id,
          name: req.user?.name || 'Unknown User',
        }));
        setRequests(formattedRequests);
      } else {
        console.warn('ConnectionRequests: Failed to load requests', result.error);
        setRequests([]);
      }
    } catch (error) {
      console.error('ConnectionRequests: Error loading requests', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (connectionId, name) => {
    try {
      const result = await ConnectionApi.acceptConnectionRequest(connectionId);
      if (result.success) {
        setRequests(prev => prev.filter(req => req.connectionId !== connectionId));
        Alert.alert('Success', `Connection request from ${name} accepted`);
      } else {
        Alert.alert('Error', result.error || 'Failed to accept connection request');
      }
    } catch (error) {
      console.error('ConnectionRequests: Accept error', error);
      Alert.alert('Error', 'Failed to accept connection request');
    }
  };

  const rejectRequest = async (connectionId, name) => {
    try {
      const result = await ConnectionApi.rejectConnectionRequest(connectionId);
      if (result.success) {
        setRequests(prev => prev.filter(req => req.connectionId !== connectionId));
        Alert.alert('Success', `Connection request from ${name} rejected`);
      } else {
        Alert.alert('Error', result.error || 'Failed to reject connection request');
      }
    } catch (error) {
      console.error('ConnectionRequests: Reject error', error);
      Alert.alert('Error', 'Failed to reject connection request');
    }
  };

  if (loading) {
    return (
      <Container>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading connection requests...</Text>
        </View>
      </Container>
    );
  }

  return (
    <Container>
      <FlatList
        data={requests}
        keyExtractor={item => item.connectionId}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <View style={styles.buttons}>
              <TouchableOpacity onPress={() => acceptRequest(item.connectionId, item.name)} style={[styles.button, styles.accept]}>
                <Text style={styles.buttonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => rejectRequest(item.connectionId, item.name)} style={[styles.button, styles.reject]}>
                <Text style={styles.buttonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No pending connection requests.</Text>
          </View>
        }
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});

export default ConnectionRequestsScreen;
