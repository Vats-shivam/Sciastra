import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from '../Skeleton';

const ChatMessageSkeleton = () => (
  <View style={styles.container}>
    <View style={styles.receivedRow}>
      <Skeleton width={32} height={32} borderRadius={16} />
      <Skeleton width={180} height={48} borderRadius={16} style={{ marginLeft: 8 }} />
    </View>
    <View style={styles.sentRow}>
      <Skeleton width={160} height={40} borderRadius={16} style={{ alignSelf: 'flex-end' }} />
    </View>
    <View style={styles.receivedRow}>
      <Skeleton width={32} height={32} borderRadius={16} />
      <Skeleton width={220} height={60} borderRadius={16} style={{ marginLeft: 8 }} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  receivedRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  sentRow: {
    marginBottom: 16,
  },
});

export default ChatMessageSkeleton;
