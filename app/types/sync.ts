/**
 * TypeScript Types for HubSpot Customer Sync System
 *
 * Note: HubSpotContact is re-exported from the centralized hubspot.ts types
 * to maintain backwards compatibility while avoiding duplication.
 */

// Re-export HubSpotContact from centralized types
export type { HubSpotContact } from './hubspot';

export interface SyncResult {
  success: boolean
  synced: number
  skipped: number
  errors: number
  duration: string
  timestamp: string
  errorMessage?: string
}

export interface SyncLog {
  id: string
  sync_type: 'manual' | 'automated'
  status: 'success' | 'error' | 'running'
  contacts_synced: number
  contacts_skipped: number
  errors: number
  duration_ms: number
  error_message?: string
  triggered_by: string
  created_at: string
}

// Note: SyncStatus interface was removed - it was never imported anywhere.
// If needed in the future, use a more specific name like CustomerSyncRunStatus.

export interface SupabaseContact {
  id: string
  hs_object_id: string

  // Contact info
  firstname?: string
  lastname?: string
  email?: string
  phone?: string
  company?: string

  // Status
  active_customer?: string
  lifecyclestage?: string

  // Timestamps
  createdate?: string
  lastmodifieddate?: string
  synced_at?: string

  // Ownership
  user_id?: string

  // Additional business fields
  [key: string]: any
}
