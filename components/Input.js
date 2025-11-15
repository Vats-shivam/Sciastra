import React from 'react';
import { TextInput, View, Text, StyleSheet } from 'react-native';
import colors from '../config/colors';

const Input = ({ label, error, ...props }) => (
  <View style={styles.wrapper}>
    {label && <Text style={styles.label}>{label}</Text>}
    <TextInput
      style={[styles.input, error && styles.errorBorder]}
      placeholderTextColor={colors.textSecondary}
      {...props}
    />
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    color: colors.textPrimary,
    marginBottom: 6,
    fontFamily: 'Gilroy-SemiBold',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    fontFamily: 'Gilroy-Regular',
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  errorBorder: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    marginTop: 4,
    fontSize: 12,
  },
});

export default Input;
