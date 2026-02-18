/**
 * Public API: Get Client Information
 *
 * This is a PUBLIC endpoint (no authentication required)
 * Used by the client authorization page to display client info
 * and check if they've already connected their GBP account.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy initialization - create Supabase client only at runtime, not build time
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role key for public API
    {
      auth: {
        persistSession: false,
      },
    }
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const supabase = getSupabaseAdmin();
  try {
    const { clientId } = await params;

    // Validate client ID format (should be a UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(clientId)) {
      return NextResponse.json(
        { error: 'Invalid client ID format' },
        { status: 404 }
      );
    }

    // Fetch client info
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, business_name, email, status')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      console.error('[Public API] Client not found:', clientError);
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Check if client is active
    if (client.status !== 'active') {
      return NextResponse.json(
        { error: 'Client authorization is not active. Please contact your agency.' },
        { status: 403 }
      );
    }

    // Check if client already has a connected account
    const { data: connectedAccount } = await supabase
      .from('pipedream_connected_accounts')
      .select('id, account_name, account_email, created_at')
      .eq('client_id', clientId)
      .eq('healthy', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Return client info and connection status
    return NextResponse.json({
      client: {
        id: client.id,
        name: client.name,
        business_name: client.business_name,
        email: client.email,
        status: client.status,
      },
      connectedAccount: connectedAccount,
    });
  } catch (error) {
    console.error('[Public API] Error fetching client:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}