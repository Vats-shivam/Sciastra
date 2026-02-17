import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from '../Skeleton';

const NotificationSkeleton = () => (
  <View style={styles.container}>
    <Skeleton width={44} height={44} borderRadius={22} />
    <View style={styles.content}>
      <Skeleton width="90%" height={14} style={{ marginBottom: 8 }} />
      <Skeleton width={60} height={12} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
});

export default NotificationSkeleton;
