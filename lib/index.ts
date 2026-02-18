/**
 * Library Utilities Index
 *
 * Centralized exports for commonly used library utilities.
 * Import from '@/lib' for cleaner imports.
 *
 * @example
 * import { createLogger, captureError, supabase } from '@/lib';
 */

// ============================================================
// LOGGING
// ============================================================
export {
  createLogger,
  logger,
  logTiming,
  withContext,
  type Logger,
  type LogContext,
  type LogLevel,
  type LogEntry,
} from './logger';

// ============================================================
// ERROR MONITORING
// ============================================================
export {
  captureError,
  captureMessage,
  setUser,
  setTag,
  setContext,
  addBreadcrumb,
  withErrorCapture,
  reportReactError,
  initMonitoring,
  type ErrorContext,
  type UserContext,
  type SeverityLevel,
} from './monitoring';

// ============================================================
// SUPABASE
// ============================================================
export {
  supabase,
  getCurrentUser,
  getCurrentSession,
  signOut,
} from './supabase/client';

// ============================================================
// CACHE
// ============================================================
export {
  CACHE_KEYS,
  invalidateContacts,
  invalidateContact,
  invalidateReviews,
  invalidateLocations,
  invalidatePlacesSearch,
  invalidateAll,
} from './cache/invalidate';

// ============================================================
// SYNC UTILITIES
// ============================================================
export {
  MAX_RETRIES,
  INITIAL_BACKOFF_MS,
  authenticateSupabase,
  retryWithBackoff,
  sleep,
  formatDuration,
} from './sync/utils';
