/**
 * Public OAuth Callback Handler
 *
 * This is a PUBLIC endpoint (no authentication required)
 * Handles the OAuth callback from Pipedream Connect when a client
 * authorizes their Google Business Profile.
 *
 * Flow:
 * 1. Pipedream redirects here with account_id after successful OAuth
 * 2. Extract client_id from external_user_id (format: client_${clientId})
 * 3. Save the connected account with client_id linked
 * 4. Redirect back to the connect page with success status
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

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  try {
    const searchParams = request.nextUrl.searchParams;

    // Get parameters from Pipedream callback
    const accountId = searchParams.get('account_id');
    const externalUserId = searchParams.get('external_user_id');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('[OAuth Callback] Error from Pipedream:', error);
      const errorMessage = searchParams.get('error_description') || 'Authorization failed';

      // If we have external_user_id, extract client_id and redirect to connect page with error
      if (externalUserId && externalUserId.startsWith('client_')) {
        const clientId = externalUserId.replace('client_', '');
        return NextResponse.redirect(
          new URL(`/connect/${clientId}?error=${encodeURIComponent(errorMessage)}`, request.url)
        );
      }

      // Otherwise show generic error
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    // Validate required parameters
    if (!accountId || !externalUserId) {
      console.error('[OAuth Callback] Missing parameters:', { accountId, externalUserId });
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Extract client_id from external_user_id (format: client_${clientId})
    if (!externalUserId.startsWith('client_')) {
      console.error('[OAuth Callback] Invalid external_user_id format:', externalUserId);
      return NextResponse.json(
        { error: 'Invalid authorization format' },
        { status: 400 }
      );
    }

    const clientId = externalUserId.replace('client_', '');

    // Validate client exists and is active
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, business_name')
      .eq('id', clientId)
      .eq('status', 'active')
      .single();

    if (clientError || !client) {
      console.error('[OAuth Callback] Client not found or inactive:', clientError);
      return NextResponse.json(
        { error: 'Client not found or inactive' },
        { status: 404 }
      );
    }

    // Check if account already exists (in case of duplicate callbacks)
    const { data: existingAccount } = await supabase
      .from('pipedream_connected_accounts')
      .select('id')
      .eq('pipedream_account_id', accountId)
      .eq('client_id', clientId)
      .maybeSingle();

    if (existingAccount) {
      console.log('[OAuth Callback] Account already exists, redirecting to success');
      return NextResponse.redirect(
        new URL(`/connect/${clientId}?success=true`, request.url)
      );
    }

    // Save the connected account with client_id linked
    const { data: savedAccount, error: saveError } = await supabase
      .from('pipedream_connected_accounts')
      .insert({
        pipedream_account_id: accountId,
        external_id: externalUserId, // Store the full external_id
        client_id: clientId, // Link to the client
        app_name: 'google_my_business',
        account_name: client.business_name || client.name, // Use client's business name
        healthy: true,
        metadata: {
          connected_via: 'public_authorization',
          client_name: client.name,
          client_business: client.business_name,
        },
      })
      .select()
      .single();

    if (saveError) {
      console.error('[OAuth Callback] Failed to save account:', saveError);
      return NextResponse.json(
        { error: 'Failed to save account connection' },
        { status: 500 }
      );
    }

    console.log('[OAuth Callback] Account saved successfully:', {
      id: savedAccount.id,
      account_id: accountId,
      client_id: clientId,
    });

    // Redirect back to the connect page with success status
    return NextResponse.redirect(
      new URL(`/connect/${clientId}?success=true`, request.url)
    );
  } catch (error) {
    console.error('[OAuth Callback] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}