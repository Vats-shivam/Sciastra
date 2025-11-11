import logger from './Logger';

class ApiLogger {
  constructor() {
    this.currentScreen = null;
  }

  setCurrentScreen(screenName) {
    if (!screenName) {
      return;
    }

    this.currentScreen = screenName;
    const message = `Screen visited: ${screenName}`;
    console.log(message);
    logger.info(message, { screen: screenName, type: 'screen_visit' });
  }

  clearCurrentScreen(screenName) {
    if (this.currentScreen === screenName) {
      this.currentScreen = null;
    }
  }

  getCurrentScreen() {
    return this.currentScreen;
  }

  logApiCall(url, method = 'GET') {
    const screen = this.currentScreen;
    const message = `API called: ${method.toUpperCase()} ${url}`;
    console.log(`${message} | Screen: ${screen || 'unknown'}`);

    logger.info(message, {
      screen: screen || 'unknown',
      method: method.toUpperCase(),
      url,
      type: 'api_call',
    });
  }

  logApiResponse(url, method = 'GET', status, responseData, error = null) {
    const screen = this.currentScreen;
    const normalizedMethod = method.toUpperCase();

    let responsePreview;
    try {
      if (typeof responseData === 'string') {
        responsePreview = responseData;
      } else {
        responsePreview = JSON.stringify(responseData, null, 2);
      }
    } catch (serializationError) {
      responsePreview = '[Unable to serialize response data]';
    }

    const baseMessage = `API response: ${normalizedMethod} ${url} -> ${status}`;
    const consoleMessage = `${baseMessage} | Screen: ${screen || 'unknown'}`;

    if (error) {
      console.warn(consoleMessage, '\nResponse:', responsePreview, '\nError:', error);
      logger.error(baseMessage, {
        screen: screen || 'unknown',
        method: normalizedMethod,
        url,
        status,
        response: responseData,
        error: typeof error === 'string' ? error : error?.message || error,
        type: 'api_response',
      });
    } else {
      console.log(consoleMessage, '\nResponse:', responsePreview);
      logger.info(baseMessage, {
        screen: screen || 'unknown',
        method: normalizedMethod,
        url,
        status,
        response: responseData,
        type: 'api_response',
      });
    }
  }
}

const apiLogger = new ApiLogger();

export default apiLogger;
