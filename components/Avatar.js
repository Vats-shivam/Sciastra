import React from 'react';
import { Image, StyleSheet } from 'react-native';
import colors from '../config/colors';

const Avatar = ({ uri, size = 50 }) => (
  <Image
    style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
    source={uri ? { uri } : require('../assets/icon.png')}
  />
);

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: colors.secondary,
  },
});

export default Avatar;
