import React, { createContext, useContext, useState } from 'react';
import NotificationPopup from '../components/NotificationPopup';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState({
    visible: false,
    message: '',
    type: 'info',
    duration: 3000,
    position: 'top',
  });

  const showNotification = ({
    message,
    type = 'info',
    duration = 3000,
    position = 'top',
  }) => {
    setNotification({
      visible: true,
      message,
      type,
      duration,
      position,
    });
  };

  const hideNotification = () => {
    setNotification(prev => ({
      ...prev,
      visible: false,
    }));
  };

  const showSuccess = (message, duration = 3000) => {
    showNotification({ message, type: 'success', duration });
  };

  const showError = (message, duration = 4000) => {
    showNotification({ message, type: 'error', duration });
  };

  const showWarning = (message, duration = 3500) => {
    showNotification({ message, type: 'warning', duration });
  };

  const showInfo = (message, duration = 3000) => {
    showNotification({ message, type: 'info', duration });
  };

  const value = {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationPopup
        visible={notification.visible}
        message={notification.message}
        type={notification.type}
        duration={notification.duration}
        position={notification.position}
        onHide={hideNotification}
      />
    </NotificationContext.Provider>
  );
};

export default NotificationContext;