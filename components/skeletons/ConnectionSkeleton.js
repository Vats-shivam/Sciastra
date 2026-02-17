import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from '../Skeleton';

const ConnectionSkeleton = () => (
  <View style={styles.container}>
    <Skeleton width={56} height={56} borderRadius={28} />
    <View style={styles.content}>
      <Skeleton width={120} height={16} style={{ marginBottom: 8 }} />
      <Skeleton width={90} height={12} />
    </View>
    <Skeleton width={80} height={36} borderRadius={8} />
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

export default ConnectionSkeleton;
