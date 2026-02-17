import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from '../Skeleton';

const PostDetailSkeleton = () => (
  <View style={styles.container}>
    <View style={styles.header}>
      <Skeleton width={48} height={48} borderRadius={24} />
      <View style={styles.headerText}>
        <Skeleton width={130} height={16} style={{ marginBottom: 8 }} />
        <Skeleton width={90} height={12} />
      </View>
    </View>
    <View style={styles.content}>
      <Skeleton width="100%" height={14} style={{ marginBottom: 8 }} />
      <Skeleton width="95%" height={14} style={{ marginBottom: 8 }} />
      <Skeleton width="70%" height={14} />
    </View>
    <Skeleton width="100%" height={280} borderRadius={12} style={{ marginVertical: 16 }} />
    <View style={styles.actions}>
      <Skeleton width={70} height={24} />
      <Skeleton width={90} height={24} />
      <Skeleton width={70} height={24} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  content: {
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 24,
  },
});

export default PostDetailSkeleton;
