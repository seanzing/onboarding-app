// @ts-nocheck - Pipedream SDK Account type is incomplete (missing email, credentials.name properties)
/**
 * GET /api/pipedream/fetch-account-details?accountId={accountId}
 *
 * Fetches account details from Pipedream using the Server SDK.
 * This endpoint is called AFTER OAuth completes to retrieve the user's
 * Google account name and email.
 *
 * Security:
 * - Uses Pipedream Server SDK with Project ID + Client Secret
 * - Called from frontend after OAuth success with the account ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { PipedreamClient } from '@pipedream/sdk';

export async function GET(request: NextRequest) {
  try {
    // Get accountId from query params
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    console.log('[API /api/pipedream/fetch-account-details] Fetching account details for:', accountId);

    if (!accountId) {
      return NextResponse.json(
        { error: 'Missing required parameter: accountId' },
        { status: 400 }
      );
    }

    // Initialize Pipedream Server SDK
    const projectId = process.env.PIPEDREAM_PROJECT_ID!;
    const clientId = process.env.PIPEDREAM_CLIENT_ID!;
    const clientSecret = process.env.PIPEDREAM_CLIENT_SECRET!;

    if (!projectId || !clientId || !clientSecret) {
      console.error('[API] Missing Pipedream credentials');
      return NextResponse.json(
        { error: 'Server configuration error: Missing Pipedream credentials' },
        { status: 500 }
      );
    }

    console.log('[API] Creating Pipedream client with Server SDK...');

    const client = new PipedreamClient({
      projectId,
      clientId,
      clientSecret,
    });

    console.log('[API] Fetching account details from Pipedream...');

    // Fetch account details with credentials
    const accountDetails = await client.accounts.retrieve(accountId, {
      includeCredentials: true,
    });

    console.log('[API] ✅ Successfully fetched account details:', {
      id: accountDetails.id,
      name: accountDetails.name || 'N/A',
      email: accountDetails.email || 'N/A',
      hasCredentials: !!accountDetails.credentials,
    });

    // Extract name and email from credentials or account object
    const accountName = accountDetails.name || accountDetails.credentials?.name || accountDetails.credentials?.userinfo?.name;
    const accountEmail = accountDetails.email || accountDetails.credentials?.email || accountDetails.credentials?.userinfo?.email;

    console.log('[API] Extracted details:', {
      accountName,
      accountEmail,
    });

    return NextResponse.json({
      success: true,
      account: {
        id: accountDetails.id,
        name: accountName,
        email: accountEmail,
        full: accountDetails, // Include full response for debugging
      },
    });
  } catch (error: any) {
    console.error('[API] Error fetching account details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account details', details: error.message },
      { status: 500 }
    );
  }
}
