import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from '../Skeleton';

const ChatItemSkeleton = () => (
  <View style={styles.container}>
    <Skeleton width={52} height={52} borderRadius={26} />
    <View style={styles.content}>
      <Skeleton width={140} height={16} style={{ marginBottom: 8 }} />
      <Skeleton width={100} height={12} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 8,
    marginVertical: 4,
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
});

export default ChatItemSkeleton;
