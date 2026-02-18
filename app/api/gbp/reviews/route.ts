/**
 * GBP Reviews API Route
 *
 * GET /api/gbp/reviews
 * Returns reviews for a location from Google Business Profile API.
 *
 * POST /api/gbp/reviews
 * Reply to a review.
 *
 * Query params:
 * - accountId: GBP account ID
 * - locationId: GBP location ID
 * - pageToken: Pagination token
 */

import { NextResponse } from 'next/server';
import { createGBPClient } from '@/lib/gbp/client';
import { getGBPAccessToken } from '@/lib/gbp/token-manager';

// Default Route36 account and location IDs
const DEFAULT_ACCOUNT_ID = '103378246033774877708';
const DEFAULT_LOCATION_ID = '3833833563855340375';

export async function GET(request: Request) {
  const startTime = Date.now();

  try {
    // Get account/location from query params or use defaults
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId') || DEFAULT_ACCOUNT_ID;
    const locationId = searchParams.get('locationId') || DEFAULT_LOCATION_ID;
    const pageToken = searchParams.get('pageToken') || undefined;

    console.log(`[API GBP Reviews] Fetching reviews for location: ${locationId}`);

    // Fetch from Google
    const accessToken = await getGBPAccessToken();
    const client = createGBPClient(accessToken, accountId, locationId);
    const reviews = await client.getReviews(accountId, locationId, pageToken);

    console.log(`[API GBP Reviews] ✅ Fetched ${reviews.reviews?.length || 0} reviews (${Date.now() - startTime}ms)`);

    return NextResponse.json({
      success: true,
      ...reviews,
    });
  } catch (error) {
    console.error('[API] GBP reviews error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch reviews',
        success: false,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Get access token from TokenManager (handles refresh automatically)
    const accessToken = await getGBPAccessToken();

    const body = await request.json();
    const { reviewName, comment } = body;

    if (!reviewName || !comment) {
      return NextResponse.json(
        { error: 'reviewName and comment are required' },
        { status: 400 }
      );
    }

    const client = createGBPClient(accessToken);
    const result = await client.replyToReview(reviewName, comment);

    console.log(`[API GBP Reviews] ✅ Reply posted successfully`);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[API] GBP reply error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to reply to review',
        success: false,
      },
      { status: 500 }
    );
  }
}
