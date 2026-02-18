/**
 * Public Save Connection Endpoint
 *
 * Called by the Pipedream SDK after successful OAuth authorization.
 * Saves the connected account to the database with client_id linkage.
 *
 * This PUBLIC endpoint does not require authentication because:
 * 1. It validates the client exists and is active via Supabase
 * 2. It only allows linking accounts to existing, active clients
 * 3. The Pipedream account_id comes from OAuth flow (trusted source)
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
  console.log('[API /api/public/save-connection] Saving OAuth connection from SDK');

  try {
    // Get connection details from request body
    const {
      client_id,
      account_id,
      external_user_id,
      account_name,
      account_email,
      app_name = 'google_my_business',
      // NEW: Unique OAuth session tracking
      oauth_session_id,
      attempt_timestamp,
      // NEW: Complete Pipedream account object for account management
      pipedream_account_full,
      // NEW: Connect token information
      connect_token,
      connect_token_expires_at,
    } = await req.json();

    // Validate required fields
    if (!client_id || !client_id.trim() || !account_id || !external_user_id) {
      console.error('[API] Missing required fields:', { client_id, account_id, external_user_id });
      return NextResponse.json(
        { error: 'Missing required fields: client_id (HubSpot contact ID), account_id, external_user_id' },
        { status: 400 }
      );
    }

    // Normalize client_id (trim whitespace)
    const normalizedClientId = client_id.trim();

    // Special handling for ZING_MANAGER - create client if it doesn't exist
    const isZingManager = normalizedClientId === 'ZING_MANAGER';

    // Look up client by hubspot_contact_id
    let { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, business_name, status, hubspot_contact_id, hubspot_company_id')
      .eq('hubspot_contact_id', normalizedClientId)
      .single();

    // For ZING_MANAGER, auto-create the client if it doesn't exist
    if (isZingManager && (clientError || !client)) {
      console.log('[API] Creating ZING_MANAGER client record...');

      const { data: newClient, error: createError } = await supabase
        .from('clients')
        .insert({
          name: 'Zing GBP Manager',
          business_name: 'Zing GBP Manager Account',
          hubspot_contact_id: 'ZING_MANAGER',
          hubspot_company_id: 'ZING_MANAGER',
          status: 'active',
        })
        .select()
        .single();

      if (createError || !newClient) {
        console.error('[API] Failed to create ZING_MANAGER client:', createError);
        return NextResponse.json(
          { error: 'Failed to create Zing Manager client record' },
          { status: 500 }
        );
      }

      client = newClient;
      console.log('[API] Created ZING_MANAGER client:', newClient.id);
    }

    if (clientError || !client) {
      console.error('[API] Client not found for HubSpot contact ID:', normalizedClientId, clientError);
      return NextResponse.json(
        { error: `Client not found for HubSpot contact ID: ${normalizedClientId}. Please connect via contact page first.` },
        { status: 404 }
      );
    }

    if (client.status !== 'active') {
      console.error('[API] Client is not active:', client.status);
      return NextResponse.json(
        { error: 'Client is not active' },
        { status: 403 }
      );
    }

    console.log('[API] Validated client:', {
      id: client.id,
      hubspot_contact_id: client.hubspot_contact_id,
      name: client.name,
      business_name: client.business_name,
    });

    console.log('[API] 🆔 OAuth Session ID:', oauth_session_id);

    // Save the connected account with COMPLETE metadata for account management
    const { data: savedAccount, error: saveError } = await supabase
      .from('pipedream_connected_accounts')
      .insert({
        // Core identification
        pipedream_account_id: account_id,
        external_id: external_user_id,
        client_id: client.id,  // Use the Supabase client UUID, not HubSpot ID
        app_name: app_name,

        // Universal HubSpot ID Strategy - Link to HubSpot company
        hubspot_company_id: client.hubspot_company_id || null,

        // Display information
        account_name: account_name || client.business_name || client.name,
        account_email: account_email,

        // Health status
        healthy: true,

        // Complete metadata for account management
        metadata: {
          // Connection method
          connected_via: 'sdk',
          connected_at: new Date().toISOString(),

          // UNIQUE OAuth session tracking (globally unique per attempt)
          oauth_session_id: oauth_session_id,
          attempt_timestamp: attempt_timestamp,

          // Complete Pipedream account object (for account management)
          // Includes: id, name, external_id, healthy, dead, created_at, updated_at,
          //          expires_at, error, last_refreshed_at, next_refresh_at, app{}, credentials{}
          pipedream_account: pipedream_account_full,

          // Connect token information (for debugging)
          connect_token_used: connect_token,
          connect_token_expires_at: connect_token_expires_at,

          // Client information (for reference)
          client_name: client.name,
          client_business_name: client.business_name,

          // Timestamps
          saved_to_database_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (saveError) {
      console.error('[API] Failed to save connection:', saveError);

      // Check if it's a duplicate connection
      if (saveError.code === '23505') {
        return NextResponse.json(
          { error: 'This account is already connected' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to save connection', details: saveError.message },
        { status: 500 }
      );
    }

    console.log('[API] ✅ Connection saved successfully with COMPLETE data for account management!');
    console.log('[API] Database Row ID (UUID, unique per connection):', savedAccount.id);
    console.log('[API] Pipedream Account ID (from OAuth):', savedAccount.pipedream_account_id);
    console.log('[API] Client ID:', savedAccount.client_id);
    console.log('[API] 🆔 OAuth Session ID (globally unique per attempt):', oauth_session_id);
    console.log('[API] Metadata includes:', {
      oauth_session_id: !!oauth_session_id,
      pipedream_account_full: !!pipedream_account_full,
      connect_token_info: !!connect_token,
      timestamps: true,
    });

    return NextResponse.json({
      success: true,
      account: savedAccount,
    });

  } catch (error: any) {
    console.error('[API] Save connection error:', error);

    return NextResponse.json(
      {
        error: error.message || 'Failed to save connection',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
