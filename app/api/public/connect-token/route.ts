/**
 * Public Connect Token Generation for Client OAuth
 *
 * This PUBLIC endpoint generates Pipedream Connect tokens for clients
 * to authorize their Google Business Profile without logging in.
 *
 * Security: Uses service role to verify client exists and is active
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
  console.log('[API /api/public/connect-token] Generating public Connect token for client');

  try {
    // Get client ID and optional client name from request body
    const { client_id, client_name } = await req.json();

    if (!client_id || !client_id.trim()) {
      return NextResponse.json(
        { error: 'Missing client_id (HubSpot contact ID required)' },
        { status: 400 }
      );
    }

    // Normalize client_id (trim whitespace)
    const normalizedClientId = client_id.trim();

    // Try to find existing client by HubSpot contact ID
    let { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, business_name, status, hubspot_contact_id')
      .eq('hubspot_contact_id', normalizedClientId)
      .single();

    // If client doesn't exist, create one
    if (clientError && clientError.code === 'PGRST116') {
      console.log('[API] Client not found, creating new client record for HubSpot contact ID:', normalizedClientId);

      const { data: newClient, error: insertError } = await supabase
        .from('clients')
        .insert({
          // id will be auto-generated UUID by Supabase
          name: client_name || `Contact ${normalizedClientId.slice(0, 8)}`,
          business_name: client_name,
          hubspot_contact_id: normalizedClientId,
          status: 'active',
          notes: 'Auto-created from HubSpot contact connection',
        })
        .select()
        .single();

      if (insertError) {
        console.error('[API] Failed to create client:', insertError);

        // Check if error is due to unique constraint violation (duplicate hubspot_contact_id)
        if (insertError.code === '23505' && insertError.message.includes('unique_hubspot_contact_id')) {
          // Race condition: Another request created the client between our check and insert
          // Try to fetch the client that was just created
          console.log('[API] ⚠️ Race condition detected, fetching existing client...');

          const { data: existingClient, error: fetchError } = await supabase
            .from('clients')
            .select('id, name, business_name, status, hubspot_contact_id')
            .eq('hubspot_contact_id', normalizedClientId)
            .single();

          if (!fetchError && existingClient) {
            console.log('[API] ✅ Found existing client after race condition');
            client = existingClient;
          } else {
            return NextResponse.json(
              { error: 'Client creation race condition - please retry', details: insertError.message },
              { status: 409 }
            );
          }
        } else {
          return NextResponse.json(
            { error: 'Failed to create client record', details: insertError.message },
            { status: 500 }
          );
        }
      } else if (newClient) {
        client = newClient;
        console.log('[API] ✅ Client created successfully:', {
          id: newClient.id,
          hubspot_contact_id: newClient.hubspot_contact_id,
          name: newClient.name
        });
      }

    } else if (clientError) {
      console.error('[API] Client query error:', clientError);
      return NextResponse.json(
        { error: 'Failed to query client', details: clientError.message },
        { status: 500 }
      );
    }

    // Validate client exists and is active
    if (!client) {
      console.error('[API] Client record not found after lookup/creation');
      return NextResponse.json(
        { error: 'Client record not found' },
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

    // Use direct API calls instead of SDK (SDK has auth issues)
    const clientId = process.env.PIPEDREAM_CLIENT_ID!;
    const clientSecret = process.env.PIPEDREAM_CLIENT_SECRET!;
    const projectId = process.env.PIPEDREAM_PROJECT_ID!;

    // Use HubSpot contact ID as external_user_id for Pipedream
    const externalUserId = normalizedClientId;

    console.log(`[API] Creating Pipedream token for client: ${client.name}`);
    console.log(`[API] External User ID: ${externalUserId}`);
    // Security: Don't log credentials, even partially

    // Step 1: Exchange client credentials for access token
    const tokenExchangeResponse = await fetch('https://api.pipedream.com/v1/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenExchangeResponse.ok) {
      const errorText = await tokenExchangeResponse.text();
      console.error('[API] Token exchange failed:', errorText);
      throw new Error(`Token exchange failed: ${tokenExchangeResponse.status} - ${errorText}`);
    }

    const { access_token } = await tokenExchangeResponse.json();
    // Security: Don't log tokens

    // Step 2: Create connect token
    const connectTokenResponse = await fetch(
      `https://api.pipedream.com/v1/connect/${projectId}/tokens`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
          'x-pd-environment': 'production',
        },
        body: JSON.stringify({
          external_user_id: externalUserId,
        }),
      }
    );

    if (!connectTokenResponse.ok) {
      const errorText = await connectTokenResponse.text();
      console.error('[API] Connect token creation failed:', errorText);
      throw new Error(`Connect token creation failed: ${connectTokenResponse.status} - ${errorText}`);
    }

    const tokenResponse = await connectTokenResponse.json();
    console.log(`[API] Pipedream token created, expires:`, tokenResponse.expires_at);
    // Security: Don't log token values

    return NextResponse.json({
      token: tokenResponse.token,
      expiresAt: tokenResponse.expires_at,
      connectLinkUrl: tokenResponse.connect_link_url,
      externalUserId: externalUserId,
      clientName: client.business_name || client.name,
    });

  } catch (error: any) {
    console.error('[API] Pipedream token generation error:', error);

    return NextResponse.json(
      {
        error: error.message || 'Failed to generate Pipedream token',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
