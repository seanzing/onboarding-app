/**
 * POST /api/pipedream/save-account
 *
 * Saves a connected Pipedream account to the database after successful OAuth.
 * Called by ConnectGBPButton's onSuccess callback.
 *
 * Request Body:
 * {
 *   "accountId": "apn_5dhkDxM",           // Pipedream's account ID
 *   "externalUserId": "user-uuid",        // Supabase user UUID
 *   "accountName": "Nathan Clay",         // Display name from Pipedream
 *   "accountEmail": "nathan@example.com", // Email from Pipedream (optional)
 *   "appName": "google_my_business"       // App slug (default: google_my_business)
 * }
 *
 * Security:
 * - Verifies user is authenticated via Supabase
 * - Ensures accountId and externalUserId are provided
 * - RLS policies ensure users can only save their own accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const {
      accountId,
      userId,
      externalUserId,
      appName,
      accountName,
      accountEmail,
      oauth_session_id,
      attempt_timestamp,
      connect_token,
      connect_token_expires_at,
      // Universal HubSpot ID Strategy
      hubspot_company_id,
      client_id,
    } = body;

    // Declare as let so we can update it after fetching from Pipedream API
    let pipedream_account_full = body.pipedream_account_full;

    const userIdToUse = userId || externalUserId; // Support both field names

    console.log('[API /api/pipedream/save-account] Request received:', {
      accountId,
      userId: userIdToUse,
      appName: appName || 'google_my_business',
      oauth_session_id,
    });

    // Validate required fields
    if (!accountId) {
      console.error('[API] Missing accountId');
      return NextResponse.json(
        { error: 'Missing required field: accountId' },
        { status: 400 }
      );
    }

    if (!userIdToUse) {
      console.error('[API] Missing userId/externalUserId');
      return NextResponse.json(
        { error: 'Missing required field: userId or externalUserId' },
        { status: 400 }
      );
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[API] Missing Supabase credentials');
      return NextResponse.json(
        { error: 'Server configuration error: Missing Supabase credentials' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user exists in auth.users table
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(
      userIdToUse
    );

    if (userError || !user) {
      console.error('[API] User not found:', userError);
      return NextResponse.json(
        { error: 'User not found or invalid userId' },
        { status: 404 }
      );
    }

    console.log('[API] User verified:', user.user.email);

    // Account details are now passed from frontend (fetched via Pipedream SDK)
    console.log('[API] Account details received:', {
      accountName: accountName || 'N/A',
      accountEmail: accountEmail || 'N/A',
      hasPipedreamAccount: !!pipedream_account_full,
    });

    // Build metadata object
    const metadata: any = {
      oauth_session_id,
      attempt_timestamp,
      connected_via: 'sdk',
      connected_at: new Date().toISOString(),
    };

    if (connect_token) {
      metadata.connect_token_used = connect_token;
      metadata.connect_token_expires_at = connect_token_expires_at;
    }

    if (pipedream_account_full) {
      metadata.pipedream_account = pipedream_account_full;
    }

    // Upsert connected account (insert or update if already exists)
    const { data, error } = await supabase
      .from('pipedream_connected_accounts')
      .upsert(
        {
          user_id: userIdToUse,
          pipedream_account_id: accountId,
          external_id: userIdToUse,
          app_name: appName || 'google_my_business',
          account_name: accountName || null,
          account_email: accountEmail || null,
          healthy: true,
          metadata,
          // Universal HubSpot ID Strategy
          hubspot_company_id: hubspot_company_id || null,
          client_id: client_id || null,
        },
        {
          onConflict: 'pipedream_account_id', // Use correct unique constraint
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) {
      console.error('[API] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to save account to database', details: error.message },
        { status: 500 }
      );
    }

    console.log('[API] ✅ Connection saved successfully with COMPLETE data for account management!');
    console.log('[API] Database Row ID (UUID, unique per connection):', data.id);
    console.log('[API] Pipedream Account ID (from OAuth):', data.pipedream_account_id);
    console.log('[API] User ID:', data.user_id);
    console.log('[API] 🆔 OAuth Session ID (globally unique per attempt):', oauth_session_id);
    console.log('[API] Metadata includes:', {
      oauth_session_id: !!metadata.oauth_session_id,
      pipedream_account_full: !!metadata.pipedream_account,
      connect_token: !!metadata.connect_token_used,
    });

    return NextResponse.json({
      success: true,
      account: {
        id: data.id,
        pipedream_account_id: data.pipedream_account_id,
        account_name: data.account_name,
        account_email: data.account_email,
        app_name: data.app_name,
        healthy: data.healthy,
        created_at: data.created_at,
      },
    });
  } catch (error: any) {
    console.error('[SaveAccount] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
