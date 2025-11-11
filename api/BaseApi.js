// api/BaseApi.js
import axios from 'axios';
import { REQUEST_CONFIG, ERROR_MESSAGES } from '../config/apiConfig';
import logger from '../services/Logger';
import apiLogger from '../services/ApiLogger';

class BaseApiService {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.setupAxiosInterceptors();
  }

  setupAxiosInterceptors() {
    // Request interceptor for logging
    axios.interceptors.request.use(
      (config) => {
        const { url, method, headers, data } = config;
        const normalizedMethod = method?.toUpperCase() || 'GET';
        const normalizedUrl =
          url?.startsWith('http') || !config.baseURL
            ? url
            : `${config.baseURL}${url}`;

        if (normalizedUrl) {
          apiLogger.logApiCall(normalizedUrl, normalizedMethod);
        }

        // Log the request
        logger.logApiRequest(url, normalizedMethod, headers, data);

        // Log production environment info
        if (!__DEV__) {
          logger.info('Production API Request', {
            url,
            method: normalizedMethod,
            baseURL: config.baseURL,
            timeout: config.timeout,
          });
        }

        return config;
      },
      (error) => {
        logger.logAppError(error, 'API Request Interceptor');
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    axios.interceptors.response.use(
      (response) => {
        const { config, status, data } = response;
        const normalizedMethod = config.method?.toUpperCase() || 'GET';
        const normalizedUrl =
          config.url?.startsWith('http') || !config.baseURL
            ? config.url
            : `${config.baseURL}${config.url}`;

        // Log successful response
        logger.logApiResponse(
          config.url,
          config.method?.toUpperCase(),
          status,
          data
        );

        if (normalizedUrl) {
          apiLogger.logApiResponse(normalizedUrl, normalizedMethod, status, data);
        }

        return response;
      },
      (error) => {
        // Log error response
        const { config, response } = error;
        const status = response?.status;
        const responseData = response?.data;
        const normalizedMethod = config?.method?.toUpperCase() || 'GET';
        const normalizedUrl =
          config?.url?.startsWith('http') || !config?.baseURL
            ? config?.url
            : `${config?.baseURL || ''}${config?.url || ''}`;

        logger.logApiResponse(
          config?.url,
          config?.method?.toUpperCase(),
          status,
          responseData,
          error
        );

        if (normalizedUrl) {
          apiLogger.logApiResponse(
            normalizedUrl,
            normalizedMethod,
            status ?? 'NETWORK_ERROR',
            responseData,
            error
          );
        }

        // Log network errors specifically
        if (error.message.includes('Network Error') || !response) {
          logger.error('Network Error in Production', {
            type: 'network_error',
            url: config?.url,
            method: config?.method,
            message: error.message,
            code: error.code,
            stack: error.stack,
          });
        }

        return Promise.reject(error);
      }
    );
  }

  async makeRequest(url, options = {}) {
    const {
      method = 'GET',
      headers = {},
      data = null,
      timeout = REQUEST_CONFIG.TIMEOUT,
      retryAttempts = REQUEST_CONFIG.RETRY_ATTEMPTS,
      ...otherOptions
    } = options;

    const config = {
      url,
      method,
      headers,
      data,
      timeout,
      baseURL: this.baseURL,
      ...otherOptions,
    };

    let lastError;

    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        if (attempt > 0) {
          logger.info(`API Retry Attempt ${attempt}`, { url, method });
          await this.delay(REQUEST_CONFIG.RETRY_DELAY * attempt);
        }

        const response = await axios(config);

        if (attempt > 0) {
          logger.info('API Retry Successful', { url, method, attempt });
        }

        return {
          success: true,
          data: response.data,
          status: response.status,
          headers: response.headers,
        };

      } catch (error) {
        lastError = error;

        logger.error(`API Request Failed (Attempt ${attempt + 1})`, {
          url,
          method,
          attempt: attempt + 1,
          error: error.message,
          status: error.response?.status,
          responseData: error.response?.data,
        });

        // Don't retry for certain status codes
        if (error.response?.status === 401 || error.response?.status === 403) {
          break;
        }
      }
    }

    // All retries failed
    return this.handleError(lastError);
  }

  handleError(error) {
    const response = error.response;
    const status = response?.status;
    const data = response?.data;

    logger.logAppError(error, 'API Error Handler');

    // Network errors
    if (!response || error.message.includes('Network Error')) {
      return {
        success: false,
        error: ERROR_MESSAGES.NETWORK_ERROR,
        message: ERROR_MESSAGES.NETWORK_ERROR,
        originalError: error.message,
      };
    }

    // Timeout errors
    if (error.code === 'ECONNABORTED') {
      return {
        success: false,
        error: ERROR_MESSAGES.TIMEOUT_ERROR,
        message: ERROR_MESSAGES.TIMEOUT_ERROR,
        originalError: error.message,
      };
    }

    // HTTP status errors
    switch (status) {
      case 401:
        return {
          success: false,
          error: ERROR_MESSAGES.UNAUTHORIZED,
          message: data?.message || ERROR_MESSAGES.UNAUTHORIZED,
          status,
        };

      case 500:
      case 502:
      case 503:
      case 504:
        return {
          success: false,
          error: ERROR_MESSAGES.SERVER_ERROR,
          message: data?.message || ERROR_MESSAGES.SERVER_ERROR,
          status,
        };

      default:
        return {
          success: false,
          error: data?.message || ERROR_MESSAGES.GENERIC_ERROR,
          message: data?.message || ERROR_MESSAGES.GENERIC_ERROR,
          status,
          data,
        };
    }
  }

  // Helper method for delays
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get request headers with common settings
  getHeaders(includeAuth = true, accessToken = null, customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...customHeaders,
    };

    if (includeAuth && accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    // Log headers in production for debugging
    if (!__DEV__) {
      logger.debug('Request Headers', {
        hasAuth: !!headers.Authorization,
        contentType: headers['Content-Type'],
        customHeadersCount: Object.keys(customHeaders).length,
      });
    }

    return headers;
  }
}

export default BaseApiService;