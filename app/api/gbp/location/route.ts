/**
 * GBP Location API Route
 *
 * GET /api/gbp/location
 * Returns location data with feature eligibility flags.
 * Uses TokenManager for automatic token refresh.
 */

import { NextResponse } from 'next/server';
import { createGBPClient } from '@/lib/gbp/client';
import { getGBPAccessToken } from '@/lib/gbp/token-manager';

// Default Route36 account and location IDs
const DEFAULT_ACCOUNT_ID = '103378246033774877708';
const DEFAULT_LOCATION_ID = '3833833563855340375';

export async function GET(request: Request) {
  try {
    // Get access token from TokenManager (handles refresh automatically)
    const accessToken = await getGBPAccessToken();

    // Get account/location from query params or use defaults
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId') || DEFAULT_ACCOUNT_ID;
    const locationId = searchParams.get('locationId') || DEFAULT_LOCATION_ID;

    const client = createGBPClient(accessToken, accountId, locationId);
    const { location, eligibility } = await client.getLocationWithEligibility();

    return NextResponse.json({
      success: true,
      location,
      eligibility,
      accountId,
      locationId,
    });
  } catch (error) {
    console.error('[API] GBP location error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch location',
        success: false,
      },
      { status: 500 }
    );
  }
}
