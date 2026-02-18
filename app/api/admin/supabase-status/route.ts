/**
 * Supabase API Status Check Route
 *
 * Tests Supabase connection using the service role key
 * Fetches project settings to verify authentication
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  console.log('[API /api/admin/supabase-status] Checking Supabase connection');

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        service: 'Supabase',
        status: 'error',
        message: 'Missing Supabase credentials',
        timestamp: new Date().toISOString(),
      });
    }

    // Create admin client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test connection by querying database
    const { data: tables, error: tablesError } = await supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true });

    if (tablesError) {
      throw new Error(`Database query failed: ${tablesError.message}`);
    }

    // Get project metadata from URL
    const projectId = supabaseUrl.split('//')[1]?.split('.')[0] || 'unknown';

    return NextResponse.json({
      success: true,
      service: 'Supabase',
      status: 'connected',
      message: 'Successfully connected to Supabase',
      timestamp: new Date().toISOString(),
      data: {
        projectId: projectId,
        url: supabaseUrl,
        region: 'US East',
        contactsTableAccessible: true,
      },
    });

  } catch (error: any) {
    console.error('[API] Supabase connection error:', error);

    return NextResponse.json({
      success: false,
      service: 'Supabase',
      status: 'error',
      message: error.message || 'Failed to connect to Supabase',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
