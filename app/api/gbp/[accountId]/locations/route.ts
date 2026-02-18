/**
 * GET /api/gbp/[accountId]/locations
 *
 * Fetches all Google Business Profile locations for a connected account.
 * Uses Pipedream proxy for authenticated API calls with automatic token refresh.
 *
 * @param accountId - Pipedream account ID (e.g., "apn_ygh1g71")
 * @returns List of GBP locations
 */

import { NextRequest, NextResponse } from 'next/server';
import { PipedreamClient } from '@pipedream/sdk';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;

    console.log('[API /api/gbp/locations] Fetching locations for account:', accountId);

    // Step 1: Get connected account details from database
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: connectedAccount, error: dbError } = await supabase
      .from('pipedream_connected_accounts')
      .select('*')
      .eq('pipedream_account_id', accountId)
      .single();

    if (dbError || !connectedAccount) {
      console.error('[API] Connected account not found:', dbError);
      return NextResponse.json(
        { error: 'Connected account not found' },
        { status: 404 }
      );
    }

    console.log('[API] Found connected account:', {
      accountId: connectedAccount.pipedream_account_id,
      accountName: connectedAccount.account_name,
      healthy: connectedAccount.healthy,
    });

    if (!connectedAccount.healthy) {
      return NextResponse.json(
        { error: 'Account access has been revoked. Please reconnect.' },
        { status: 401 }
      );
    }

    // Step 2: Initialize Pipedream client
    const projectId = process.env.PIPEDREAM_PROJECT_ID!;
    const clientId = process.env.PIPEDREAM_CLIENT_ID!;
    const clientSecret = process.env.PIPEDREAM_CLIENT_SECRET!;

    const client = new PipedreamClient({
      projectId,
      clientId,
      clientSecret,
    });

    // Step 3: Fetch GBP account ID from Google Business Account Management API
    console.log('[API] Fetching GBP accounts from Account Management API...');

    const accountsResponse = await client.proxy.get({
      url: 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
      accountId: accountId,
      externalUserId: connectedAccount.external_id,
      params: {
        // Fetch ALL accounts (personal + organizations user manages)
        pageSize: '100',
      },
    });

    const accountsData = accountsResponse as any;
    const accounts = accountsData?.accounts || [];

    // 🔍 DEBUG: Log the FULL response to see what data we're getting
    console.log('[API] ✨ FULL Account Management API Response:', JSON.stringify(accountsData, null, 2));
    console.log('[API] ✨ Number of accounts found:', accounts.length);
    console.log('[API] ✨ All Account Names:', accounts.map((acc: any) => `${acc.accountName} (${acc.type})`).join(', '));

    if (accounts.length === 0) {
      console.error('[API] No GBP accounts found for this user');
      return NextResponse.json(
        { error: 'No Google Business Profile accounts found. Please ensure you have access to at least one business profile.' },
        { status: 404 }
      );
    }

    // Use the first account (in format: "accounts/103378246033774877708")
    const gbpAccountId = accounts[0].name;
    console.log('[API] Found GBP account:', gbpAccountId);
    console.log('[API] Fetching locations for GBP account:', gbpAccountId);

    // Step 4: Fetch locations via Pipedream proxy
    try {
      const response = await client.proxy.get({
        url: `https://mybusinessbusinessinformation.googleapis.com/v1/${gbpAccountId}/locations`,
        accountId: accountId,
        externalUserId: connectedAccount.external_id,
        params: {
          readMask: 'name,title,storefrontAddress,phoneNumbers,websiteUri,regularHours,categories,metadata',
        },
      });

      console.log('[API] ✅ Successfully fetched locations');

      // Extract locations from response
      const responseData = response as any;
      const locations = responseData.locations || [];

      console.log('[API] Returning', locations.length, 'locations');

      return NextResponse.json({
        success: true,
        accountId: accountId,
        accountName: connectedAccount.account_name,
        gbpAccountId: gbpAccountId,
        gbpAccount: accounts[0], // Include full account info
        locations: locations,
        count: locations.length,
      });
    } catch (locationsError: any) {
      // If locations fetch fails, still return account info!
      console.log('[API] ⚠️ Could not fetch locations, but returning account info anyway');
      console.log('[API] Locations error:', locationsError.message);

      // Parse the error to provide better guidance
      let errorReason = 'Unable to access location data. Please check account permissions.';
      let configurationHelp = null;

      // Check for "not allowed for this app" error - this is a Google Cloud configuration issue
      const errorBody = locationsError.message || '';
      if (errorBody.includes('not allowed for this app') || errorBody.includes('domain')) {
        errorReason = 'Google Business Profile API is not enabled for this application.';
        configurationHelp = {
          issue: 'OAuth scope or API not enabled',
          steps: [
            '1. Go to Google Cloud Console > APIs & Services > Library',
            '2. Search for "My Business Business Information API"',
            '3. Enable the API for your project',
            '4. Ensure OAuth scope includes "https://www.googleapis.com/auth/business.manage"',
            '5. Re-authorize the Pipedream connection after making changes',
          ],
          documentation: 'https://developers.google.com/my-business/content/basic-setup',
        };
      } else if (accounts[0].verificationState === 'UNVERIFIED') {
        errorReason = 'Account is not verified. Please verify your Google Business Profile to access location data.';
      }

      return NextResponse.json({
        success: true, // Still success - we have account info!
        accountId: accountId,
        accountName: connectedAccount.account_name,
        gbpAccountId: gbpAccountId,
        gbpAccount: accounts[0], // Full account info from Account Management API
        locations: [],
        count: 0,
        warning: {
          message: 'Could not fetch locations',
          reason: errorReason,
          verificationState: accounts[0].verificationState,
          accountType: accounts[0].type,
          configurationHelp: configurationHelp,
        },
      });
    }

  } catch (error: any) {
    console.error('[API] Error fetching GBP locations:', error);

    // Handle specific error cases
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json(
        { error: 'Access denied. Account may need to be reconnected.', details: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch locations', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new Google Business Profile location
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;
    const body = await request.json();

    console.log('[API /api/gbp/locations] Creating new location for account:', accountId);
    console.log('[API] Request body:', JSON.stringify(body, null, 2));

    // Validate required fields
    if (!body.title) {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      );
    }

    if (!body.categories?.primaryCategory) {
      return NextResponse.json(
        { error: 'primaryCategory is required' },
        { status: 400 }
      );
    }

    // Step 1: Get connected account details from database
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: connectedAccount, error: dbError } = await supabase
      .from('pipedream_connected_accounts')
      .select('*')
      .eq('pipedream_account_id', accountId)
      .single();

    if (dbError || !connectedAccount) {
      console.error('[API] Connected account not found:', dbError);
      return NextResponse.json(
        { error: 'Connected account not found' },
        { status: 404 }
      );
    }

    console.log('[API] Found connected account:', {
      accountId: connectedAccount.pipedream_account_id,
      accountName: connectedAccount.account_name,
      healthy: connectedAccount.healthy,
    });

    if (!connectedAccount.healthy) {
      return NextResponse.json(
        { error: 'Account access has been revoked. Please reconnect.' },
        { status: 401 }
      );
    }

    // Step 2: Initialize Pipedream client
    const projectId = process.env.PIPEDREAM_PROJECT_ID!;
    const clientId = process.env.PIPEDREAM_CLIENT_ID!;
    const clientSecret = process.env.PIPEDREAM_CLIENT_SECRET!;

    const client = new PipedreamClient({
      projectId,
      clientId,
      clientSecret,
    });

    // Step 3: Fetch GBP account ID from Google Business Account Management API
    console.log('[API] Fetching GBP accounts from Account Management API...');

    const accountsResponse = await client.proxy.get({
      url: 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
      accountId: accountId,
      externalUserId: connectedAccount.external_id,
    });

    const accountsData = accountsResponse as any;
    const accounts = accountsData?.accounts || [];

    if (accounts.length === 0) {
      console.error('[API] No GBP accounts found for this user');
      return NextResponse.json(
        { error: 'No Google Business Profile accounts found. Please ensure you have access to at least one business profile.' },
        { status: 404 }
      );
    }

    // Use the first account (in format: "accounts/103378246033774877708")
    const gbpAccountId = accounts[0].name;
    console.log('[API] Found GBP account:', gbpAccountId);
    console.log('[API] Creating location for GBP account:', gbpAccountId);

    // Step 4: Create location via Pipedream proxy
    const response = await client.proxy.post({
      url: `https://mybusinessbusinessinformation.googleapis.com/v1/${gbpAccountId}/locations`,
      accountId: accountId,
      externalUserId: connectedAccount.external_id,
      body: body,
    });

    console.log('[API] ✅ Successfully created location');

    return NextResponse.json({
      success: true,
      location: response,
      message: 'Location created successfully',
    });

  } catch (error: any) {
    console.error('[API] Error creating location:', error);

    // Handle specific error cases
    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json(
        { error: 'Access denied. Account may need to be reconnected.', details: error.message },
        { status: 401 }
      );
    }

    if (error.statusCode === 400) {
      return NextResponse.json(
        { error: 'Invalid request. Check the data being sent.', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create location', details: error.message },
      { status: 500 }
    );
  }
}
