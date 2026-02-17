// screens/NotificationsScreen.js
import React, { useState, useEffect } from 'react';
import { FlatList, Text, StyleSheet, View, TouchableOpacity } from 'react-native';
import Container from '../components/Container';
import Card from '../components/Card';
import colors from '../config/colors';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNotification } from '../contexts/NotificationContext';
import useScreenApiLogger from '../hooks/useScreenApiLogger';
import CustomRefreshControl from '../components/CustomRefreshControl';
import { NotificationSkeleton } from '../components/skeletons';

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { showError } = useNotification();

  useScreenApiLogger('Notification');

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
      //   setNotifications([]);
      // }

      setNotifications([]);
    } catch (error) {
      showError('Something went wrong while loading notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // TODO: Replace with actual API call
      setNotifications([]);
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
        <View style={{ padding: 16 }}>
          {[1, 2, 3, 4, 5].map((i) => <NotificationSkeleton key={i} />)}
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
          <CustomRefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
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
