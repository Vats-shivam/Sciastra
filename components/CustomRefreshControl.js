import React from 'react';
import { View, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { RefreshControl } from 'react-native';
import colors from '../config/colors';

const CustomRefreshControl = ({ refreshing, onRefresh, ...props }) => {
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.button}
      colors={[colors.button]}
      progressViewOffset={20}
      style={styles.refreshControl}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  refreshControl: {
    backgroundColor: 'transparent',
  },
});

export default CustomRefreshControl;

