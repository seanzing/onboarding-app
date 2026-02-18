/**
 * All Contacts Sync API Endpoint
 *
 * POST /api/sync/all-contacts
 *
 * Syncs ALL contacts (leads, customers, opportunities) from HubSpot to Supabase.
 *
 * MODES (pass via query param or request body):
 * - mode=sync (DEFAULT): Full sync - fetches all contacts, merges, upserts.
 * - mode=incremental: Only syncs contacts modified since last sync (FAST - for hourly cron).
 * - mode=insert: Only adds NEW contacts. Never modifies existing.
 *
 * SAFETY: Update mode uses SELECTIVE column updates - it only modifies
 * HubSpot-sourced fields, preserving all Supabase-only fields like:
 * business_type, hubspot_company_id, locations, active_customer, etc.
 *
 * AUTHORIZATION: Protected by middleware which requires either:
 * - A valid user session (for manual triggers from dashboard)
 * - A valid CRON_SECRET in Authorization header (for automated cron jobs)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncAllContacts, SyncMode } from '@/lib/sync/all-contacts-sync-service'

// Vercel Pro allows up to 300 seconds (5 minutes) for serverless functions
// This is needed for large sync operations that may take longer than the default 10s
export const maxDuration = 300

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let jobId: string | null = null

  // Initialize Supabase client for sync_jobs logging
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Validate required environment variables (no fallbacks for security)
    const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const TEST_EMAIL = process.env.TEST_EMAIL
    const TEST_PASSWORD = process.env.TEST_PASSWORD

    if (!HUBSPOT_ACCESS_TOKEN) {
      console.error('[All Contacts Sync API] Missing HUBSPOT_ACCESS_TOKEN')
      return NextResponse.json(
        { error: 'Server configuration error: Missing HubSpot credentials' },
        { status: 500 }
      )
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('[All Contacts Sync API] Missing Supabase configuration')
      return NextResponse.json(
        { error: 'Server configuration error: Missing Supabase credentials' },
        { status: 500 }
      )
    }

    if (!TEST_EMAIL || !TEST_PASSWORD) {
      console.error('[All Contacts Sync API] Missing TEST_EMAIL or TEST_PASSWORD')
      return NextResponse.json(
        { error: 'Server configuration error: Missing sync credentials' },
        { status: 500 }
      )
    }

    // Get mode from query param or request body (default is now 'sync')
    const url = new URL(request.url)
    let mode: SyncMode = 'sync' // Default to full sync (Fetch-Merge-Upsert)

    // Check query param first
    const queryMode = url.searchParams.get('mode')
    if (queryMode && ['insert', 'sync', 'incremental'].includes(queryMode)) {
      mode = queryMode as SyncMode
    } else {
      // Try to get mode from request body
      try {
        const body = await request.json()
        if (body.mode && ['insert', 'sync', 'incremental'].includes(body.mode)) {
          mode = body.mode as SyncMode
        }
      } catch {
        // No body or invalid JSON - use default mode
      }
    }

    // Determine trigger type for logging (auth is handled by middleware)
    const authHeader = request.headers.get('authorization')
    const isCronTrigger = authHeader?.startsWith('Bearer ')

    // Create sync job record BEFORE starting sync
    const { data: job } = await supabase
      .from('sync_jobs')
      .insert({
        job_type: `hubspot_contacts_${mode}`,
        status: 'running',
        metadata: {
          mode,
          trigger: isCronTrigger ? 'cron' : 'manual',
        },
      })
      .select()
      .single()

    if (job) {
      jobId = job.id
    }

    // Run the sync
    console.log('[All Contacts Sync API] Starting sync...')
    console.log('[All Contacts Sync API] Mode:', mode)
    console.log('[All Contacts Sync API] Trigger type:', isCronTrigger ? 'automated (cron)' : 'manual (dashboard)')

    const result = await syncAllContacts(
      HUBSPOT_ACCESS_TOKEN,
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      TEST_EMAIL,
      TEST_PASSWORD,
      mode
    )

    console.log('[All Contacts Sync API] Sync complete:', result)

    // Calculate duration
    const durationMs = Date.now() - startTime

    // Update sync job record with results
    if (jobId) {
      await supabase
        .from('sync_jobs')
        .update({
          status: result.success ? 'completed' : 'failed',
          records_fetched: result.totalContacts,
          records_created: result.inserted,
          records_updated: result.updated,
          records_skipped: result.skipped,
          errors: result.errors,
          completed_at: new Date().toISOString(),
          duration_ms: durationMs,
          error_message: result.errorMessage || null,
          metadata: {
            mode: result.mode,
            syncedContactsCount: result.syncedContacts?.length || 0,
            syncSinceTimestamp: result.syncSinceTimestamp || null,
          },
        })
        .eq('id', jobId)
    }

    // Return result
    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    })
  } catch (error: any) {
    const durationMs = Date.now() - startTime
    console.error('[All Contacts Sync API] Error:', error)

    // Update sync job record with error
    if (jobId) {
      await supabase
        .from('sync_jobs')
        .update({
          status: 'failed',
          errors: 1,
          error_message: error.message || 'Unknown error',
          completed_at: new Date().toISOString(),
          duration_ms: durationMs,
        })
        .eq('id', jobId)
    }

    return NextResponse.json(
      {
        success: false,
        totalContacts: 0,
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: 1,
        duration: '0s',
        timestamp: new Date().toISOString(),
        mode: 'insert',
        errorMessage: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

// Also support GET for testing (returns status and documentation)
export async function GET() {
  return NextResponse.json({
    message: 'All Contacts Sync API (Fetch-Merge-Upsert Pattern)',
    method: 'POST',
    description: 'Syncs ALL contacts from HubSpot to Supabase using safe merge pattern',
    pattern: {
      name: 'Fetch-Merge-Upsert',
      steps: [
        '1. Fetch existing Supabase record (if any)',
        '2. Merge: Start with existing data, overlay HubSpot values (only where HubSpot has data)',
        '3. UPSERT the complete merged object',
      ],
    },
    modes: {
      sync: {
        description: 'DEFAULT: Full sync - fetches all, merges, and upserts all contacts',
        safety: 'SAFE - Never destroys data, only adds/updates where HubSpot has values',
        behavior: 'Preserves ALL Supabase-only fields automatically',
        default: true,
      },
      incremental: {
        description: 'Only syncs contacts modified since last sync (FAST - ~10-30 seconds)',
        safety: 'SAFE - Same merge behavior as full sync',
        behavior: 'Uses HubSpot Search API to fetch only recent changes',
        recommended: 'For hourly/frequent cron jobs',
      },
      insert: {
        description: 'Only adds NEW contacts. Skips existing.',
        safety: 'SAFEST - No modification of existing records',
      },
    },
    preservedFields: [
      'hubspot_company_id',
      'business_type',
      'business_category_type',
      'business_hours',
      'current_website',
      'website_status',
      'locations',
      'active_customer',
      'gbp_ready',
      'published_status',
      'publishing_fee_paid',
      'completeness_score',
      'created_at',
    ],
    usage: {
      fullSync: 'POST /api/sync/all-contacts (DEFAULT)',
      incremental: 'POST /api/sync/all-contacts?mode=incremental (RECOMMENDED for hourly cron)',
      insertOnly: 'POST /api/sync/all-contacts?mode=insert',
      bodyFormat: '{ "mode": "sync" | "incremental" | "insert" }',
    },
    requires: 'UNIQUE constraint on (hubspot_contact_id, user_id)',
    authorization: 'Requires CRON_SECRET in Authorization header or authenticated session',
  })
}
