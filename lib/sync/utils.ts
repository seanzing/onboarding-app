/**
 * Shared Sync Utilities
 *
 * Common utility functions and constants used by sync services.
 * Extracted from customer-sync-service.ts and all-contacts-sync-service.ts
 * to eliminate code duplication.
 */

import { SupabaseClient } from '@supabase/supabase-js'

// ============================================================
// SHARED CONSTANTS
// ============================================================

/** Maximum number of retries for failed operations */
export const MAX_RETRIES = 3

/** Initial backoff delay in milliseconds (doubles with each retry) */
export const INITIAL_BACKOFF_MS = 1000

// ============================================================
// AUTHENTICATION
// ============================================================

/**
 * Authenticate with Supabase using email/password credentials
 *
 * @param supabase - Supabase client instance
 * @param email - User email address
 * @param password - User password
 * @returns User ID string
 * @throws Error if authentication fails
 */
export async function authenticateSupabase(
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<string> {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError || !authData.user) {
    throw new Error(`Supabase auth failed: ${authError?.message || 'No user returned'}`)
  }

  return authData.user.id
}

// ============================================================
// RETRY LOGIC
// ============================================================

/**
 * Retry helper with exponential backoff
 *
 * Executes a function and retries on failure with exponentially increasing delays.
 * Delay pattern: 1s, 2s, 4s (default with MAX_RETRIES=3)
 *
 * @param fn - Async function to execute
 * @param maxRetries - Maximum number of retry attempts (default: MAX_RETRIES)
 * @returns Result of the function
 * @throws Last error if all retries fail
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error

      if (attempt < maxRetries - 1) {
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt)
        await sleep(backoffMs)
      }
    }
  }

  throw lastError || new Error('Retry failed')
}

// ============================================================
// TIMING UTILITIES
// ============================================================

/**
 * Sleep for a specified duration
 *
 * @param ms - Duration in milliseconds
 * @returns Promise that resolves after the delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Format duration in human-readable format
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted string like "1h 30m 45s", "5m 30s", or "45s"
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}
