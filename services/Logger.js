// services/Logger.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000; // Keep last 1000 logs
    this.logKey = 'app_production_logs';
    this.isProduction = !__DEV__;

    // Load existing logs on startup
    this.loadLogs();
  }

  async loadLogs() {
    try {
      const storedLogs = await AsyncStorage.getItem(this.logKey);
      if (storedLogs) {
        this.logs = JSON.parse(storedLogs);
      }
    } catch (error) {
      console.warn('Failed to load stored logs:', error);
    }
  }

  async saveLogs() {
    try {
      // Keep only the latest logs to prevent storage overflow
      const logsToSave = this.logs.slice(-this.maxLogs);
      await AsyncStorage.setItem(this.logKey, JSON.stringify(logsToSave));
      this.logs = logsToSave;
    } catch (error) {
      console.warn('Failed to save logs:', error);
    }
  }

  createLogEntry(level, message, extra = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      extra,
      environment: this.isProduction ? 'production' : 'development',
      platform: Platform.OS,
    };

    // Always log to console in development
    if (!this.isProduction) {
      const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
      console[consoleMethod](`[${level.toUpperCase()}] ${message}`, extra);
    }

    // Add to internal logs array
    this.logs.push(logEntry);

    // Save to AsyncStorage (debounced)
    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => this.saveLogs(), 1000);

    return logEntry;
  }

  info(message, extra = {}) {
    return this.createLogEntry('info', message, extra);
  }

  warn(message, extra = {}) {
    return this.createLogEntry('warn', message, extra);
  }

  error(message, extra = {}) {
    return this.createLogEntry('error', message, extra);
  }

  debug(message, extra = {}) {
    return this.createLogEntry('debug', message, extra);
  }

  // Log API requests
  logApiRequest(url, method, headers, body) {
    this.info('API Request', {
      type: 'api_request',
      url,
      method,
      headers: this.sanitizeHeaders(headers),
      body: this.sanitizeBody(body),
    });
  }

  // Log API responses
  logApiResponse(url, method, status, responseData, error = null) {
    const level = error || status >= 400 ? 'error' : 'info';
    this[level]('API Response', {
      type: 'api_response',
      url,
      method,
      status,
      responseData: this.sanitizeResponseData(responseData),
      error: error ? error.message : null,
    });
  }

  // Log app errors
  logAppError(error, context = '') {
    this.error('App Error', {
      type: 'app_error',
      context,
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
  }

  // Log user actions
  logUserAction(action, details = {}) {
    this.info('User Action', {
      type: 'user_action',
      action,
      details,
    });
  }

  // Get logs for debugging
  async getLogs(level = null, limit = 100) {
    await this.loadLogs(); // Ensure we have latest logs

    let filteredLogs = this.logs;

    if (level) {
      filteredLogs = this.logs.filter(log => log.level === level);
    }

    return filteredLogs.slice(-limit).reverse(); // Most recent first
  }

  // Export logs as text
  async exportLogs() {
    const logs = await this.getLogs(null, 500);
    return logs.map(log =>
      `${log.timestamp} [${log.level.toUpperCase()}] ${log.message} ${JSON.stringify(log.extra)}`
    ).join('\n');
  }

  // Clear logs
  async clearLogs() {
    this.logs = [];
    try {
      await AsyncStorage.removeItem(this.logKey);
    } catch (error) {
      console.warn('Failed to clear logs:', error);
    }
  }

  // Sanitize sensitive data
  sanitizeHeaders(headers) {
    if (!headers) return headers;
    const sanitized = { ...headers };
    if (sanitized.Authorization) {
      sanitized.Authorization = 'Bearer ***';
    }
    return sanitized;
  }

  sanitizeBody(body) {
    if (!body) return body;
    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body);
        return this.sanitizeObject(parsed);
      } catch {
        return '[Binary or invalid JSON]';
      }
    }
    return this.sanitizeObject(body);
  }

  sanitizeResponseData(data) {
    if (!data) return data;
    return this.sanitizeObject(data);
  }

  sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth'];
    const sanitized = { ...obj };

    Object.keys(sanitized).forEach(key => {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '***';
      }
    });

    return sanitized;
  }

  // Get device info for debugging
  getDeviceInfo() {
    return {
      platform: Platform.OS,
      version: Platform.Version,
      isProduction: this.isProduction,
      timestamp: new Date().toISOString(),
    };
  }
}

// Create singleton instance
const logger = new Logger();

export default logger;