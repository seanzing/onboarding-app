/**
 * GBP Local Posts API Route
 *
 * Fetches local posts for a GBP location.
 */

import { NextResponse } from 'next/server';
import { createGBPClient } from '@/lib/gbp/client';
import { getGBPAccessToken } from '@/lib/gbp/token-manager';

const DEFAULT_ACCOUNT_ID = '103378246033774877708';
const DEFAULT_LOCATION_ID = '3833833563855340375';

export async function GET(request: Request) {
  try {
    // Get access token from TokenManager (handles refresh automatically)
    const accessToken = await getGBPAccessToken();

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId') || DEFAULT_ACCOUNT_ID;
    const locationId = searchParams.get('locationId') || DEFAULT_LOCATION_ID;
    const pageToken = searchParams.get('pageToken') || undefined;

    const client = createGBPClient(accessToken, accountId, locationId);
    const postsResponse = await client.getLocalPosts(accountId, locationId, pageToken);

    return NextResponse.json({
      success: true,
      localPosts: postsResponse.localPosts || [],
      nextPageToken: postsResponse.nextPageToken,
    });
  } catch (error) {
    console.error('[API] GBP posts error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
