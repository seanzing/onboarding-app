/**
 * GET    /api/gbp/[accountId]/locations/[locationId]
 * PATCH  /api/gbp/[accountId]/locations/[locationId]
 *
 * Get or update a specific GBP location.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PipedreamClient } from '@pipedream/sdk';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET - Fetch single location details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; locationId: string }> }
) {
  try {
    const { accountId, locationId } = await params;

    console.log('[API /api/gbp/location] Fetching location:', {
      accountId,
      locationId,
    });

    // Get connected account from database
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: connectedAccount, error: dbError } = await supabase
      .from('pipedream_connected_accounts')
      .select('*')
      .eq('pipedream_account_id', accountId)
      .single();

    if (dbError || !connectedAccount) {
      return NextResponse.json(
        { error: 'Connected account not found' },
        { status: 404 }
      );
    }

    if (!connectedAccount.healthy) {
      return NextResponse.json(
        { error: 'Account access has been revoked. Please reconnect.' },
        { status: 401 }
      );
    }

    // Initialize Pipedream client
    const client = new PipedreamClient({
      projectId: process.env.PIPEDREAM_PROJECT_ID!,
      clientId: process.env.PIPEDREAM_CLIENT_ID!,
      clientSecret: process.env.PIPEDREAM_CLIENT_SECRET!,
    });

    // Fetch location details
    const response = await client.proxy.get({
      url: `https://mybusinessbusinessinformation.googleapis.com/v1/${locationId}`,
      accountId: accountId,
      externalUserId: connectedAccount.external_id,
      params: {
        readMask: '*', // Get all fields
      },
    });

    console.log('[API] ✅ Successfully fetched location details');

    return NextResponse.json({
      success: true,
      location: response,
    });

  } catch (error: any) {
    console.error('[API] Error fetching location:', error);

    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json(
        { error: 'Access denied. Account may need to be reconnected.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch location', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update location details
 *
 * Updates Google Business Profile location via Pipedream proxy.
 * Pipedream handles OAuth token management and automatic refresh.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; locationId: string }> }
) {
  try {
    const { accountId, locationId } = await params;
    const body = await request.json();

    console.log('[API /api/gbp/location] Update requested:', {
      accountId,
      locationId,
      updatedFields: Object.keys(body),
    });

    // Get connected account from database
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: connectedAccount, error: dbError } = await supabase
      .from('pipedream_connected_accounts')
      .select('*')
      .eq('pipedream_account_id', accountId)
      .single();

    if (dbError || !connectedAccount) {
      return NextResponse.json(
        { error: 'Connected account not found' },
        { status: 404 }
      );
    }

    if (!connectedAccount.healthy) {
      return NextResponse.json(
        { error: 'Account access has been revoked. Please reconnect.' },
        { status: 401 }
      );
    }

    // Prepare update mask (tells Google which fields we're updating)
    // For nested objects, we need to specify full paths (e.g., "profile.description")
    const buildUpdateMask = (obj: any, prefix = ''): string[] => {
      const paths: string[] = [];
      for (const key in obj) {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];

        // If value is a non-null object (but not an array), recurse
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          paths.push(...buildUpdateMask(value, fullPath));
        } else {
          paths.push(fullPath);
        }
      }
      return paths;
    };

    const updateMask = buildUpdateMask(body).join(',');

    console.log('[API] Updating location via Pipedream proxy...');
    console.log('[API] Account ID:', accountId);
    console.log('[API] External User ID:', connectedAccount.external_id);
    console.log('[API] Location ID:', locationId);
    console.log('[API] Update Mask:', updateMask);
    console.log('[API] Update Body:', JSON.stringify(body, null, 2));

    // Initialize Pipedream client
    const client = new PipedreamClient({
      projectId: process.env.PIPEDREAM_PROJECT_ID!,
      clientId: process.env.PIPEDREAM_CLIENT_ID!,
      clientSecret: process.env.PIPEDREAM_CLIENT_SECRET!,
    });

    // Update location via Pipedream proxy (handles OAuth token management)
    const response = await client.proxy.patch({
      url: `https://mybusinessbusinessinformation.googleapis.com/v1/${locationId}`,
      accountId: accountId,
      externalUserId: connectedAccount.external_id,
      params: {
        updateMask: updateMask,
      },
      body: body,
    });

    console.log('[API] ✅ Successfully updated location');

    return NextResponse.json({
      success: true,
      location: response,
      message: 'Location updated successfully',
    });

  } catch (error: any) {
    console.error('[API] Error updating location:', error);

    if (error.statusCode === 401 || error.statusCode === 403) {
      return NextResponse.json(
        { error: 'Access denied. Account may need to be reconnected.' },
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
      { error: 'Failed to update location', details: error.message },
      { status: 500 }
    );
  }
}
