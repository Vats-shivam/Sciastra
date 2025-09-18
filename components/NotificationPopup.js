import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import colors from '../config/colors';

const { width } = Dimensions.get('window');

const NotificationPopup = ({
  visible,
  message,
  type = 'info', // 'success', 'error', 'warning', 'info'
  duration = 3000,
  onHide,
  position = 'top' // 'top' or 'bottom'
}) => {
  const [slideAnim] = useState(new Animated.Value(position === 'top' ? -100 : 100));

  useEffect(() => {
    if (visible) {
      // Slide in
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        handleHide();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      // Slide out
      Animated.timing(slideAnim, {
        toValue: position === 'top' ? -100 : 100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, duration, position]);

  const handleHide = () => {
    Animated.timing(slideAnim, {
      toValue: position === 'top' ? -100 : 100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      if (onHide) onHide();
    });
  };

  const getNotificationStyle = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#4CAF50',
          iconName: 'check-circle',
          iconColor: '#ffffff',
        };
      case 'error':
        return {
          backgroundColor: '#f44336',
          iconName: 'alert-circle',
          iconColor: '#ffffff',
        };
      case 'warning':
        return {
          backgroundColor: '#ff9800',
          iconName: 'alert',
          iconColor: '#ffffff',
        };
      default: // info
        return {
          backgroundColor: colors.primary,
          iconName: 'information',
          iconColor: '#ffffff',
        };
    }
  };

  const notificationStyle = getNotificationStyle();

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          backgroundColor: notificationStyle.backgroundColor,
        },
        position === 'top' ? styles.topPosition : styles.bottomPosition,
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={handleHide}
        activeOpacity={0.9}
      >
        <Icon
          name={notificationStyle.iconName}
          size={20}
          color={notificationStyle.iconColor}
          style={styles.icon}
        />
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
        <TouchableOpacity onPress={handleHide} style={styles.closeButton}>
          <Icon name="close" size={16} color={notificationStyle.iconColor} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  topPosition: {
    top: 50,
  },
  bottomPosition: {
    bottom: 100,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  icon: {
    marginRight: 12,
  },
  message: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  closeButton: {
    marginLeft: 8,
    padding: 4,
  },
});

export default NotificationPopup;