/**
 * HubSpot Customer Sync API Endpoint
 *
 * POST /api/sync/customers
 *
 * Syncs active customers (lifecyclestage='customer') from HubSpot to Supabase.
 * Can be triggered manually from the dashboard (requires auth) or automatically via cron job (requires CRON_SECRET).
 *
 * SECURITY: This endpoint is protected by middleware which requires either:
 * - A valid user session (for manual triggers from dashboard)
 * - A valid CRON_SECRET in Authorization header (for automated cron jobs)
 */

import { NextRequest, NextResponse } from 'next/server'
import { syncHubSpotCustomers } from '@/lib/sync/customer-sync-service'

export async function POST(request: NextRequest) {
  try {
    // Validate required environment variables (no fallbacks for security)
    const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const TEST_EMAIL = process.env.TEST_EMAIL
    const TEST_PASSWORD = process.env.TEST_PASSWORD

    if (!HUBSPOT_ACCESS_TOKEN) {
      console.error('[Sync API] Missing HUBSPOT_ACCESS_TOKEN')
      return NextResponse.json(
        { error: 'Server configuration error: Missing HubSpot credentials' },
        { status: 500 }
      )
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('[Sync API] Missing Supabase configuration')
      return NextResponse.json(
        { error: 'Server configuration error: Missing Supabase credentials' },
        { status: 500 }
      )
    }

    if (!TEST_EMAIL || !TEST_PASSWORD) {
      console.error('[Sync API] Missing TEST_EMAIL or TEST_PASSWORD')
      return NextResponse.json(
        { error: 'Server configuration error: Missing sync credentials' },
        { status: 500 }
      )
    }

    // Determine trigger type for logging (auth is handled by middleware)
    const authHeader = request.headers.get('authorization')
    const isCronTrigger = authHeader?.startsWith('Bearer ')

    // Run the sync
    console.log('[Sync API] Starting HubSpot customer sync...')
    console.log('[Sync API] Trigger type:', isCronTrigger ? 'automated (cron)' : 'manual (dashboard)')

    const result = await syncHubSpotCustomers(
      HUBSPOT_ACCESS_TOKEN,
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      TEST_EMAIL,
      TEST_PASSWORD
    )

    console.log('[Sync API] Sync complete:', result)

    // Return result
    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    })
  } catch (error: any) {
    console.error('[Sync API] Error:', error)

    return NextResponse.json(
      {
        success: false,
        synced: 0,
        skipped: 0,
        errors: 1,
        duration: '0s',
        timestamp: new Date().toISOString(),
        errorMessage: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

// Also support GET for testing (returns status)
export async function GET() {
  return NextResponse.json({
    message: 'HubSpot Customer Sync API',
    method: 'POST',
    description: 'Syncs active customers from HubSpot to Supabase',
    authorization: 'Requires CRON_SECRET in Authorization header or authenticated session',
  })
}
