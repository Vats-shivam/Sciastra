import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import apiLogger from '../services/ApiLogger';

const useScreenApiLogger = (screenName) => {
  useFocusEffect(
    useCallback(() => {
      apiLogger.setCurrentScreen(screenName);

      return () => {
        apiLogger.clearCurrentScreen(screenName);
      };
    }, [screenName])
  );
};

export default useScreenApiLogger;
