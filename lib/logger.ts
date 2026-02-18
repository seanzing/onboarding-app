/**
 * Structured Logger Utility
 *
 * A lightweight, type-safe logger that replaces console.* calls with
 * structured logging that includes log levels, timestamps, and context.
 *
 * Features:
 * - Log levels: debug, info, warn, error
 * - Scoped loggers via createLogger('ModuleName')
 * - Structured JSON output in production
 * - Pretty output in development
 * - Environment-based log level filtering
 * - Type-safe context objects
 *
 * Usage:
 *   import { createLogger } from '@/lib/logger';
 *   const logger = createLogger('MyComponent');
 *   logger.info('User logged in', { userId: '123' });
 *   logger.error('Failed to fetch', { error: err.message });
 *
 * Environment Variables:
 *   LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error' (default: 'info')
 *   NODE_ENV: 'development' | 'production'
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  context?: LogContext;
}

export interface Logger {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
}

// Log level priority (higher = more severe)
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Get configured log level from environment
function getConfiguredLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
  if (envLevel && envLevel in LOG_LEVELS) {
    return envLevel;
  }
  // Default to 'debug' in development, 'info' in production
  return process.env.NODE_ENV === 'development' ? 'debug' : 'info';
}

// Check if a log level should be output
function shouldLog(level: LogLevel): boolean {
  const configuredLevel = getConfiguredLogLevel();
  return LOG_LEVELS[level] >= LOG_LEVELS[configuredLevel];
}

// Format timestamp in ISO format
function getTimestamp(): string {
  return new Date().toISOString();
}

// Sanitize context to prevent sensitive data leakage
function sanitizeContext(context?: LogContext): LogContext | undefined {
  if (!context) return undefined;

  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'apikey',
    'api_key',
    'authorization',
    'auth',
    'credential',
    'private',
  ];

  const sanitized: LogContext = {};

  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some((sk) => lowerKey.includes(sk));

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeContext(value as LogContext);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// Format log entry for output
function formatLogEntry(entry: LogEntry): string {
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment) {
    // Pretty format for development
    const levelColors: Record<LogLevel, string> = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m', // green
      warn: '\x1b[33m', // yellow
      error: '\x1b[31m', // red
    };
    const reset = '\x1b[0m';
    const color = levelColors[entry.level];

    let output = `${color}[${entry.level.toUpperCase()}]${reset} [${entry.module}] ${entry.message}`;

    if (entry.context && Object.keys(entry.context).length > 0) {
      output += ` ${JSON.stringify(entry.context)}`;
    }

    return output;
  } else {
    // JSON format for production (better for log aggregation)
    return JSON.stringify(entry);
  }
}

// Output log entry to appropriate console method
function outputLog(level: LogLevel, formattedEntry: string): void {
  switch (level) {
    case 'debug':
      console.debug(formattedEntry);
      break;
    case 'info':
      console.info(formattedEntry);
      break;
    case 'warn':
      console.warn(formattedEntry);
      break;
    case 'error':
      console.error(formattedEntry);
      break;
  }
}

// Core log function
function log(module: string, level: LogLevel, message: string, context?: LogContext): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    timestamp: getTimestamp(),
    level,
    module,
    message,
    context: sanitizeContext(context),
  };

  const formatted = formatLogEntry(entry);
  outputLog(level, formatted);
}

/**
 * Create a scoped logger for a specific module/component.
 *
 * @param module - The name of the module (e.g., 'useAuth', 'SyncService', 'API:contacts')
 * @returns A logger instance with debug, info, warn, error methods
 *
 * @example
 * const logger = createLogger('MyComponent');
 * logger.info('Component mounted');
 * logger.error('Failed to load data', { error: err.message });
 */
export function createLogger(module: string): Logger {
  return {
    debug: (message: string, context?: LogContext) => log(module, 'debug', message, context),
    info: (message: string, context?: LogContext) => log(module, 'info', message, context),
    warn: (message: string, context?: LogContext) => log(module, 'warn', message, context),
    error: (message: string, context?: LogContext) => log(module, 'error', message, context),
  };
}

/**
 * Default logger for quick usage without module scoping.
 * Prefer createLogger() for better traceability.
 */
export const logger = createLogger('App');

/**
 * Log performance timing.
 *
 * @example
 * const end = logTiming('fetchContacts');
 * await fetchContacts();
 * end(); // Logs: "fetchContacts completed in 150ms"
 */
export function logTiming(operation: string, module = 'Performance'): () => void {
  const start = performance.now();
  const perfLogger = createLogger(module);

  return () => {
    const duration = Math.round(performance.now() - start);
    perfLogger.info(`${operation} completed`, { durationMs: duration });
  };
}

/**
 * Create a child logger with additional default context.
 *
 * @example
 * const userLogger = withContext(logger, { userId: '123' });
 * userLogger.info('User action'); // Includes userId in all logs
 */
export function withContext(parentLogger: Logger, defaultContext: LogContext): Logger {
  return {
    debug: (message, context) =>
      parentLogger.debug(message, { ...defaultContext, ...context }),
    info: (message, context) =>
      parentLogger.info(message, { ...defaultContext, ...context }),
    warn: (message, context) =>
      parentLogger.warn(message, { ...defaultContext, ...context }),
    error: (message, context) =>
      parentLogger.error(message, { ...defaultContext, ...context }),
  };
}
