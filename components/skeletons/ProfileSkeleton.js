import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from '../Skeleton';

const ProfileSkeleton = ({ showPosts = true }) => (
  <View style={styles.container}>
    <View style={styles.header}>
      <Skeleton width={100} height={100} borderRadius={50} style={styles.avatar} />
      <Skeleton width={150} height={20} style={{ marginTop: 16 }} />
      <Skeleton width={120} height={14} style={{ marginTop: 8 }} />
      <View style={styles.stats}>
        <Skeleton width={60} height={16} />
        <Skeleton width={60} height={16} />
      </View>
    </View>
    <View style={styles.tabs}>
      <Skeleton width={80} height={40} borderRadius={8} />
      <Skeleton width={80} height={40} borderRadius={8} />
    </View>
    {showPosts && (
      <View style={styles.posts}>
        <PostSkeletonPlaceholder />
        <PostSkeletonPlaceholder />
        <PostSkeletonPlaceholder />
      </View>
    )}
  </View>
);

const PostSkeletonPlaceholder = () => (
  <View style={styles.postCard}>
    <View style={styles.postHeader}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <View style={styles.postHeaderText}>
        <Skeleton width={100} height={14} style={{ marginBottom: 6 }} />
        <Skeleton width={70} height={12} />
      </View>
    </View>
    <Skeleton width="100%" height={12} style={{ marginBottom: 8 }} />
    <Skeleton width="80%" height={12} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    alignSelf: 'center',
  },
  stats: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 24,
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  posts: {
    marginTop: 8,
  },
  postCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(20, 37, 45, 0.5)',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  postHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
});

export default ProfileSkeleton;
