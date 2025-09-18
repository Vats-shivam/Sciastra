// screens/NotificationsScreen.js
import React, { useState, useEffect } from 'react';
import { FlatList, Text, StyleSheet, View, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import Container from '../components/Container';
import Card from '../components/Card';
import colors from '../config/colors';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNotification } from '../contexts/NotificationContext';

const mockNotifications = [
  { id: '1', text: 'Alice liked your post.', type: 'like', timestamp: new Date().toISOString(), read: false },
  { id: '2', text: 'Bob commented: "Great work!"', type: 'comment', timestamp: new Date().toISOString(), read: false },
  { id: '3', text: 'Charlie sent you a connection request.', type: 'connection', timestamp: new Date().toISOString(), read: true },
];

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { showError } = useNotification();

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call when available
      // const result = await notificationsApi.getNotifications();
      // if (result.success) {
      //   setNotifications(result.data);
      // } else {
      //   showError('Failed to load notifications');
      //   setNotifications(mockNotifications);
      // }

      // Simulate API call with mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      setNotifications(mockNotifications);
    } catch (error) {
      showError('Something went wrong while loading notifications');
      setNotifications(mockNotifications);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setNotifications(mockNotifications);
    } catch (error) {
      showError('Failed to refresh notifications');
    } finally {
      setRefreshing(false);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like': return 'thumb-up';
      case 'comment': return 'comment';
      case 'connection': return 'account-plus';
      default: return 'bell';
    }
  };

  const renderNotification = ({ item }) => (
    <Card style={[styles.card, !item.read && styles.unreadCard]}>
      <View style={styles.notificationContent}>
        <View style={styles.iconContainer}>
          <Icon
            name={getNotificationIcon(item.type)}
            size={20}
            color={item.read ? colors.textSecondary : colors.primary}
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.text, !item.read && styles.unreadText]}>{item.text}</Text>
          <Text style={styles.timestamp}>
            {new Date(item.timestamp).toLocaleDateString()}
          </Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </View>
    </Card>
  );

  if (loading) {
    return (
      <Container>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </Container>
    );
  }

  return (
    <Container>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="bell-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
      />
    </Container>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  text: {
    fontSize: 16,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  unreadText: {
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
});

export default NotificationsScreen;
