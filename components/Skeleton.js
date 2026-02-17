import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import colors from '../config/colors';

/**
 * Base skeleton placeholder with optional shimmer animation.
 * Use for loading states instead of ActivityIndicator.
 */
const Skeleton = ({ width, height, borderRadius = 6, style }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width || '100%',
          height: height || 20,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
});

export default Skeleton;
