/**
 * Get Last Customer Sync
 *
 * GET /api/sync/customers/last
 *
 * Returns the most recent customer sync log from customer_sync_logs table.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Lazy initialization - access env vars at runtime, not build time
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export async function GET() {
  try {
    // Create Supabase client with service role (bypasses RLS)
    const supabase = getSupabaseAdmin()

    // Fetch the most recent sync log
    const { data, error } = await supabase
      .from('customer_sync_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      // If no logs exist yet, return null
      if (error.code === 'PGRST116') {
        return NextResponse.json({ lastSync: null })
      }
      throw error
    }

    return NextResponse.json({ lastSync: data })
  } catch (error: any) {
    console.error('[Last Sync API] Error:', error)

    return NextResponse.json(
      { error: error.message || 'Failed to fetch last sync' },
      { status: 500 }
    )
  }
}
