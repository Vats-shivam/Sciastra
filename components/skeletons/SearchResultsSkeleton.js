import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from '../Skeleton';
import colors from '../../config/colors';

/**
 * Skeleton loader that mirrors the search results layout:
 * Topics (header + chips) → People (header + cards) → Posts (header + post cards)
 */
const SearchResultsSkeleton = () => (
  <View style={styles.container}>
    {/* Topics section */}
    <Skeleton width={70} height={18} style={styles.sectionHeader} />
    <View style={styles.topicChipsRow}>
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} width={72} height={36} borderRadius={18} />
      ))}
    </View>

    {/* People section */}
    <Skeleton width={70} height={18} style={[styles.sectionHeader, { marginTop: 16 }]} />
    {[1, 2].map((i) => (
      <View key={i} style={styles.peopleCard}>
        <Skeleton width={42} height={42} borderRadius={21} />
        <View style={styles.peopleText}>
          <Skeleton width={140} height={15} style={{ marginBottom: 8 }} />
          <Skeleton width={100} height={12} />
        </View>
      </View>
    ))}

    {/* Posts section */}
    <Skeleton width={60} height={18} style={[styles.sectionHeader, { marginTop: 16 }]} />
    {[1, 2].map((i) => (
      <View key={i} style={styles.postCard}>
        <View style={styles.postHeader}>
          <Skeleton width={48} height={48} borderRadius={24} />
          <View style={styles.postHeaderText}>
            <Skeleton width={120} height={14} style={{ marginBottom: 6 }} />
            <Skeleton width={80} height={11} />
          </View>
        </View>
        <View style={styles.postContent}>
          <Skeleton width="100%" height={12} style={{ marginBottom: 6 }} />
          <Skeleton width="85%" height={12} style={{ marginBottom: 6 }} />
          <Skeleton width="55%" height={12} />
        </View>
        <Skeleton width="100%" height={160} borderRadius={12} style={{ marginTop: 12 }} />
        <View style={styles.postActions}>
          <Skeleton width={56} height={20} />
          <Skeleton width={64} height={20} />
        </View>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  topicChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  peopleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
  },
  peopleText: {
    flex: 1,
    marginLeft: 12,
  },
  postCard: {
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(20, 37, 45, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  postContent: {
    marginTop: 12,
  },
  postActions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 24,
  },
});

export default SearchResultsSkeleton;
