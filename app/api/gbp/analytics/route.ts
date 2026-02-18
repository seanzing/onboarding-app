/**
 * GBP Analytics API Route
 *
 * GET /api/gbp/analytics - Fetches search keyword impressions and performance metrics.
 *
 * Uses the Business Profile Performance API to get:
 * - Top search keywords that led to impressions
 * - Monthly search impression data
 */

import { NextResponse } from 'next/server';
import { createGBPClient } from '@/lib/gbp/client';
import { getGBPAccessToken } from '@/lib/gbp/token-manager';

const DEFAULT_LOCATION_ID = '3833833563855340375';

export async function GET(request: Request) {
  try {
    // Get access token from TokenManager (handles refresh automatically)
    const accessToken = await getGBPAccessToken();

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId') || DEFAULT_LOCATION_ID;

    // Parse date range parameters (defaults to last 3 months)
    const now = new Date();
    const startYear = parseInt(searchParams.get('startYear') || String(now.getFullYear()));
    const startMonth = parseInt(searchParams.get('startMonth') || String(Math.max(1, now.getMonth() - 2)));
    const endYear = parseInt(searchParams.get('endYear') || String(now.getFullYear()));
    const endMonth = parseInt(searchParams.get('endMonth') || String(now.getMonth() + 1));

    const client = createGBPClient(accessToken);

    // Fetch search keywords
    const keywordsResponse = await client.getSearchKeywords(
      locationId,
      { year: startYear, month: startMonth },
      { year: endYear, month: endMonth }
    );

    // Process and sort keywords by impression count
    const keywords = (keywordsResponse.searchKeywordsCounts || [])
      .map((kw) => ({
        keyword: kw.searchKeyword,
        impressions: parseInt(kw.insightsValue?.value || '0'),
        threshold: kw.insightsValue?.threshold,
      }))
      .sort((a, b) => b.impressions - a.impressions);

    // Calculate total impressions
    const totalImpressions = keywords.reduce((sum, kw) => sum + kw.impressions, 0);

    return NextResponse.json({
      success: true,
      analytics: {
        keywords,
        totalKeywords: keywords.length,
        totalImpressions,
        dateRange: {
          start: { year: startYear, month: startMonth },
          end: { year: endYear, month: endMonth },
        },
      },
      nextPageToken: keywordsResponse.nextPageToken,
    });
  } catch (error) {
    console.error('[API] GBP analytics error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
