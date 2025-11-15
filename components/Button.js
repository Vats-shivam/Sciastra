import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../config/colors';

const Button = ({ title, onPress, buttonColor = colors.accent, disabled, loading, style }) => (
  <TouchableOpacity
    style={[styles.shadow, style, disabled && styles.disabled]}
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.92}
  >
    <LinearGradient
      colors={["#8a2be2", "#9932cc"]}
      start={[0, 0]}
      end={[1, 1]}
      style={[styles.button, disabled && styles.disabled]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </LinearGradient>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#8a2be2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    borderRadius: 24,
  },
  button: {
    paddingHorizontal: 18,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 16,
    fontFamily: 'Gilroy-SemiBold',
    letterSpacing: 0.5,
  },
});

export default Button;
