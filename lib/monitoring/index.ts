/**
 * Error Monitoring Module
 *
 * Provides a unified interface for error tracking and monitoring.
 * Currently logs to console, but designed to easily integrate with
 * Sentry, LogRocket, or other monitoring services.
 *
 * Usage:
 * ```typescript
 * import { captureError, captureMessage, setUser } from '@/lib/monitoring';
 *
 * // Capture an error
 * captureError(error, { route: '/gbp', action: 'fetchLocations' });
 *
 * // Capture a message
 * captureMessage('Sync completed', 'info', { count: 100 });
 *
 * // Set user context for error tracking
 * setUser({ id: 'user123', email: 'user@example.com' });
 * ```
 *
 * To enable Sentry:
 * 1. Install @sentry/nextjs: pnpm add @sentry/nextjs
 * 2. Run: npx @sentry/wizard@latest -i nextjs
 * 3. Update ENABLE_SENTRY below to true
 * 4. Set NEXT_PUBLIC_SENTRY_DSN in environment
 */

import { createLogger } from '@/lib/logger';

const logger = createLogger('Monitoring');

// ============================================================
// CONFIGURATION
// ============================================================

/**
 * Enable/disable Sentry integration
 * Set to true after installing @sentry/nextjs
 */
const ENABLE_SENTRY = false;

// ============================================================
// TYPES
// ============================================================

export type SeverityLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

export interface ErrorContext {
  /** Route or page where error occurred */
  route?: string;
  /** Action being performed */
  action?: string;
  /** Component name */
  component?: string;
  /** Additional tags for filtering */
  tags?: Record<string, string>;
  /** Extra data to include */
  extra?: Record<string, unknown>;
  /** Allow additional properties for flexibility */
  [key: string]: unknown;
}

export interface UserContext {
  id?: string;
  email?: string;
  username?: string;
  [key: string]: unknown;
}

// ============================================================
// SENTRY PLACEHOLDER
// Uncomment and modify when enabling Sentry
// ============================================================

// import * as Sentry from '@sentry/nextjs';

const SentryPlaceholder = {
  captureException: (error: Error, context?: ErrorContext) => {
    logger.error('Exception captured', {
      message: error.message,
      stack: error.stack,
      ...context,
    });
  },
  captureMessage: (message: string, level: SeverityLevel, context?: ErrorContext) => {
    const logMethod = level === 'error' || level === 'fatal' ? 'error' :
                      level === 'warning' ? 'warn' :
                      level === 'debug' ? 'debug' : 'info';
    logger[logMethod](message, context);
  },
  setUser: (user: UserContext | null) => {
    logger.debug('User context set', { userId: user?.id });
  },
  setTag: (key: string, value: string) => {
    logger.debug('Tag set', { key, value });
  },
  setContext: (name: string, context: Record<string, unknown>) => {
    logger.debug('Context set', { name, context });
  },
  addBreadcrumb: (breadcrumb: { message: string; category?: string; level?: SeverityLevel }) => {
    logger.debug('Breadcrumb', breadcrumb);
  },
};

// Use Sentry if enabled, otherwise use placeholder
const monitoring = ENABLE_SENTRY ? SentryPlaceholder : SentryPlaceholder;

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Capture an error and send to monitoring service
 *
 * @param error - The error to capture
 * @param context - Additional context about where/why the error occurred
 *
 * @example
 * try {
 *   await fetchData();
 * } catch (error) {
 *   captureError(error, { route: '/api/data', action: 'fetch' });
 * }
 */
export function captureError(error: Error | unknown, context?: ErrorContext): void {
  const err = error instanceof Error ? error : new Error(String(error));

  if (ENABLE_SENTRY) {
    // When Sentry is enabled, use their SDK
    // Sentry.withScope((scope) => {
    //   if (context?.tags) {
    //     Object.entries(context.tags).forEach(([key, value]) => {
    //       scope.setTag(key, value);
    //     });
    //   }
    //   if (context?.extra) {
    //     scope.setExtras(context.extra);
    //   }
    //   if (context?.route) scope.setTag('route', context.route);
    //   if (context?.action) scope.setTag('action', context.action);
    //   if (context?.component) scope.setTag('component', context.component);
    //   Sentry.captureException(err);
    // });
  }

  // Always log locally
  monitoring.captureException(err, context);
}

/**
 * Capture a message/event and send to monitoring service
 *
 * @param message - The message to capture
 * @param level - Severity level
 * @param context - Additional context
 *
 * @example
 * captureMessage('User completed onboarding', 'info', { step: 5 });
 */
export function captureMessage(
  message: string,
  level: SeverityLevel = 'info',
  context?: ErrorContext
): void {
  monitoring.captureMessage(message, level, context);
}

/**
 * Set user context for error tracking
 * Allows errors to be associated with specific users
 *
 * @param user - User information or null to clear
 *
 * @example
 * setUser({ id: 'user123', email: 'user@example.com' });
 * // Later, on logout:
 * setUser(null);
 */
export function setUser(user: UserContext | null): void {
  monitoring.setUser(user);
}

/**
 * Set a global tag for all future events
 *
 * @param key - Tag key
 * @param value - Tag value
 *
 * @example
 * setTag('environment', 'production');
 */
export function setTag(key: string, value: string): void {
  monitoring.setTag(key, value);
}

/**
 * Set additional context that will be sent with all events
 *
 * @param name - Context name
 * @param context - Context data
 *
 * @example
 * setContext('account', { planType: 'pro', features: ['sync', 'api'] });
 */
export function setContext(name: string, context: Record<string, unknown>): void {
  monitoring.setContext(name, context);
}

/**
 * Add a breadcrumb (trail of events leading to an error)
 *
 * @param message - Breadcrumb message
 * @param category - Category (e.g., 'navigation', 'api', 'ui')
 * @param level - Severity level
 *
 * @example
 * addBreadcrumb('User clicked save button', 'ui');
 * addBreadcrumb('API request started', 'api');
 */
export function addBreadcrumb(
  message: string,
  category?: string,
  level: SeverityLevel = 'info'
): void {
  monitoring.addBreadcrumb({ message, category, level });
}

/**
 * Wrap an async function with automatic error capture
 *
 * @param fn - Async function to wrap
 * @param context - Error context if the function throws
 *
 * @example
 * const safeFetch = withErrorCapture(fetchData, { action: 'fetchData' });
 * const result = await safeFetch();
 */
export function withErrorCapture<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context?: ErrorContext
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureError(error, context);
      throw error;
    }
  }) as T;
}

// ============================================================
// REACT ERROR BOUNDARY HELPER
// ============================================================

/**
 * Report error from React error boundary
 * Use this in componentDidCatch or error.tsx
 *
 * @param error - The caught error
 * @param errorInfo - React error info (componentStack)
 */
export function reportReactError(
  error: Error,
  errorInfo?: { componentStack?: string }
): void {
  captureError(error, {
    component: 'ErrorBoundary',
    extra: {
      componentStack: errorInfo?.componentStack,
    },
  });
}

// ============================================================
// INITIALIZATION
// ============================================================

/**
 * Initialize monitoring (call once at app startup)
 * Currently a no-op, but will initialize Sentry when enabled
 */
export function initMonitoring(): void {
  if (ENABLE_SENTRY) {
    // Sentry initialization would go here
    // Sentry.init({
    //   dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    //   environment: process.env.NODE_ENV,
    //   // ... other options
    // });
  }

  logger.info('Monitoring initialized', {
    sentryEnabled: ENABLE_SENTRY,
    environment: process.env.NODE_ENV,
  });
}
