// screens/MyNetworkScreen.js
import React, { useEffect, useState } from 'react';
import { FlatList, Text, TouchableOpacity, StyleSheet, View, Alert, ActivityIndicator } from 'react-native';
import Container from '../components/Container';
import Card from '../components/Card';
import colors from '../config/colors';
import chatApi from '../api/ChatApi';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ConnectionApi from '../api/ConnectionApi';
import useScreenApiLogger from '../hooks/useScreenApiLogger';

const MyNetworkScreen = ({ navigation }) => {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useScreenApiLogger('MyNetwork');

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async (withLoading = true) => {
    try {
      if (withLoading) {
        setLoading(true);
      }

      const result = await ConnectionApi.getConnections(1, 50);

      if (result.success) {
        const transformedConnections = result.data?.connections?.map(connection => ({
          id: connection?.user?.id,
          name: connection?.user?.name || 'Unknown',
          profilePic: connection?.user?.profilePic || null,
          profession: connection?.user?.profession || 'No designation',
        })).filter(item => item.id);

        setConnections(transformedConnections || []);
      } else {
        console.warn('MyNetwork: Failed to load connections:', result.error);
        setConnections([]);
      }
    } catch (error) {
      console.error('MyNetwork: Error loading connections:', error);
      setConnections([]);
    } finally {
      if (withLoading) {
        setLoading(false);
      }
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadConnections(false);
    } finally {
      setRefreshing(false);
    }
  };

  const handleMessagePress = async (connection) => {
    try {
      console.log('Starting chat with connection:', connection);

      // Create or get direct chat room with this user
      const chatResult = await chatApi.createOrGetDirectChat(connection.id);

      if (chatResult.success) {
        console.log('Chat room created/found:', chatResult.data);

        // Navigate to OneToOneChat screen with user details
        navigation.navigate('OneToOneChat', {
          userId: connection.id,
          userName: connection.name,
          avatar: connection.profilePic,
          isOnline: true,
          roomId: chatResult.data.id,
        });
      } else {
        console.error('Failed to create/get chat room:', chatResult.message);
        Alert.alert('Error', 'Failed to start chat. Please try again.');
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      Alert.alert('Error', 'Failed to start chat. Please try again.');
    }
  };

  if (loading) {
    return (
      <Container>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading connections...</Text>
        </View>
      </Container>
    );
  }

  return (
    <Container>
      <FlatList
        data={connections}
        keyExtractor={item => item.id}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="account-multiple-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No connections found.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.cardContent}>
              <TouchableOpacity
                style={styles.nameContainer}
                onPress={() => navigation.navigate('UserProfile', { userId: item.id, userName: item.name })}
              >
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.profession}>{item.profession}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.messageBtn}
                onPress={() => handleMessagePress(item)}
              >
                <Icon name="message" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />
    </Container>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    padding: 16,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
  },
  profession: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  messageBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default MyNetworkScreen;
