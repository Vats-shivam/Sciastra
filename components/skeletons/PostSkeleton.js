import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from '../Skeleton';

const PostSkeleton = () => (
  <View style={styles.container}>
    <View style={styles.header}>
      <Skeleton width={48} height={48} borderRadius={24} />
      <View style={styles.headerText}>
        <Skeleton width={120} height={16} style={{ marginBottom: 8 }} />
        <Skeleton width={80} height={12} style={{ marginBottom: 4 }} />
        <Skeleton width={60} height={12} />
      </View>
    </View>
    <View style={styles.content}>
      <Skeleton width="100%" height={14} style={{ marginBottom: 8 }} />
      <Skeleton width="90%" height={14} style={{ marginBottom: 8 }} />
      <Skeleton width="60%" height={14} />
    </View>
    <Skeleton width="100%" height={200} borderRadius={12} style={{ marginTop: 12 }} />
    <View style={styles.actions}>
      <Skeleton width={60} height={20} />
      <Skeleton width={70} height={20} />
      <Skeleton width={60} height={20} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginHorizontal: 12,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(20, 37, 45, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  content: {
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 24,
  },
});

export default PostSkeleton;
