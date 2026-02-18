/**
 * Quick Client Creation for Admin Testing
 *
 * This admin endpoint creates a temporary client record for quick testing.
 * It generates a UUID and creates a client with auto-generated name.
 *
 * Security: Requires authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy initialization - create Supabase client only at runtime, not build time
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  console.log('[API /api/admin/quick-client] Creating quick client for testing');

  try {
    // Parse optional request body for hubspot_company_id
    let hubspot_company_id: string | null = null;
    let customName: string | null = null;
    try {
      const body = await req.json();
      hubspot_company_id = body.hubspot_company_id || null;
      customName = body.name || body.business_name || null;
    } catch {
      // No body provided, that's fine for quick client
    }

    // Get auth header for user verification
    const authHeader = req.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user session
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[API] Authentication failed:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[API] Authenticated user:', user.id);

    // Generate UUID for new client
    const clientId = crypto.randomUUID();

    // Create auto-generated name with timestamp
    const now = new Date();
    const formattedDate = now.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    const clientName = customName || `Quick Connect - ${formattedDate}`;

    console.log('[API] Creating client:', {
      id: clientId,
      name: clientName,
      created_by: user.id,
      hubspot_company_id: hubspot_company_id || 'NOT PROVIDED',
    });

    // Create client record
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        id: clientId,
        name: clientName,
        business_name: clientName,
        status: 'active',
        created_by: user.id,
        notes: hubspot_company_id
          ? `Created with HubSpot Company ID: ${hubspot_company_id}`
          : 'Auto-generated for quick testing (no HubSpot link)',
        // Universal HubSpot ID Strategy
        hubspot_company_id: hubspot_company_id,
      })
      .select()
      .single();

    if (clientError) {
      console.error('[API] Failed to create client:', clientError);
      return NextResponse.json(
        { error: 'Failed to create client', details: clientError.message },
        { status: 500 }
      );
    }

    console.log('[API] ✅ Client created successfully:', client.id);

    return NextResponse.json({
      success: true,
      client_id: client.id,
      client_name: client.name,
    });

  } catch (error: any) {
    console.error('[API] Quick client creation error:', error);

    return NextResponse.json(
      {
        error: error.message || 'Failed to create quick client',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
