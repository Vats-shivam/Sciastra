import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../config/colors';

const Container = ({ children, style }) => (
  <SafeAreaView
    style={[styles.container, style]}
    edges={['top', 'right', 'bottom', 'left']} // Safe area padding all around
  >
    {children}
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,  // consistent side padding like modern apps
    paddingTop: 8,          // space from top notch/status bar
    paddingBottom: 8,       // safe gap at bottom
  },
});

export default Container;
