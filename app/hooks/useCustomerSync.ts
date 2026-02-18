/**
 * Custom Hook for HubSpot Customer Sync
 *
 * Provides methods to trigger sync and track sync status.
 */

import { useState, useCallback } from 'react'
import type { SyncResult } from '@/app/types/sync'

export function useCustomerSync() {
  const [isRunning, setIsRunning] = useState(false)
  const [lastResult, setLastResult] = useState<SyncResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  /**
   * Trigger a manual sync
   */
  const triggerSync = useCallback(async (): Promise<SyncResult> => {
    setIsRunning(true)
    setError(null)

    try {
      const response = await fetch('/api/sync/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result: SyncResult = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.errorMessage || 'Sync failed')
      }

      setLastResult(result)
      return result
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to sync customers'
      setError(errorMessage)

      const errorResult: SyncResult = {
        success: false,
        synced: 0,
        skipped: 0,
        errors: 1,
        duration: '0s',
        timestamp: new Date().toISOString(),
        errorMessage,
      }

      setLastResult(errorResult)
      throw err
    } finally {
      setIsRunning(false)
    }
  }, [])

  return {
    triggerSync,
    isRunning,
    lastResult,
    error,
  }
}
