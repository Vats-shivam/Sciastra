import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from '../Skeleton';

const EventCardSkeleton = () => (
  <View style={styles.container}>
    <Skeleton width="100%" height={140} borderRadius={12} style={styles.image} />
    <View style={styles.content}>
      <Skeleton width={80} height={12} style={{ marginBottom: 8 }} />
      <Skeleton width="100%" height={18} style={{ marginBottom: 8 }} />
      <Skeleton width={60} height={12} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(20, 37, 45, 0.65)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  image: {
    margin: 0,
    borderRadius: 0,
  },
  content: {
    padding: 16,
  },
});

export default EventCardSkeleton;
