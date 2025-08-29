import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import colors from '../config/colors';

const Button = ({ title, onPress, buttonColor = colors.accent, disabled, loading }) => (
  <TouchableOpacity
    style={[styles.button, { backgroundColor: buttonColor }, disabled && styles.disabled]}
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.9}
  >
    {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.text}>{title}</Text>}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 18,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
});

export default Button;
