import logger from './Logger';

class ApiLogger {
  constructor() {
    this.currentScreen = null;
  }

  summarizeResponseData(responseData) {
    // Avoid storing/serializing huge API payloads (e.g. feed posts) in logs.
    if (!responseData || typeof responseData !== 'object') return responseData;

    try {
      const success = responseData.success;
      const data = responseData.data;

      // Common pattern in this app: { success, data: { posts, pagination } }
      if (data && typeof data === 'object') {
        const pagination = data.pagination;
        const posts = Array.isArray(data.posts) ? data.posts : null;

        if (posts) {
          return {
            success,
            data: {
              postsCount: posts.length,
              postIdsPreview: posts.slice(0, 10).map((p) => p?.id),
              pagination,
            },
          };
        }
      }

      // Default: shallow copy with data truncated
      return {
        success,
        data: data ? '[data omitted for log size]' : data,
      };
    } catch {
      return '[Unable to summarize response data]';
    }
  }

  safePreview(responseData, maxLen = 800) {
    try {
      if (typeof responseData === 'string') return responseData.slice(0, maxLen);
      const summarized = this.summarizeResponseData(responseData);
      const s = JSON.stringify(summarized);
      return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
    } catch (e) {
      return '[Unable to serialize response preview]';
    }
  }

  setCurrentScreen(screenName) {
    if (!screenName) {
      return;
    }

    this.currentScreen = screenName;
    const message = `Screen visited: ${screenName}`;
    if (__DEV__) console.log(message);
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
    if (__DEV__) console.log(`${message} | Screen: ${screen || 'unknown'}`);

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
    const responsePreview = this.safePreview(responseData);
    const responseForLog = this.summarizeResponseData(responseData);

    const baseMessage = `API response: ${normalizedMethod} ${url} -> ${status}`;
    const consoleMessage = `${baseMessage} | Screen: ${screen || 'unknown'}`;

    if (error) {
      if (__DEV__) console.warn(consoleMessage, '\nResponse:', responsePreview, '\nError:', error);
      logger.error(baseMessage, {
        screen: screen || 'unknown',
        method: normalizedMethod,
        url,
        status,
        response: responseForLog,
        error: typeof error === 'string' ? error : error?.message || error,
        type: 'api_response',
      });
    } else {
      if (__DEV__) console.log(consoleMessage, '\nResponse:', responsePreview);
      logger.info(baseMessage, {
        screen: screen || 'unknown',
        method: normalizedMethod,
        url,
        status,
        response: responseForLog,
        type: 'api_response',
      });
    }
  }
}

const apiLogger = new ApiLogger();

export default apiLogger;
