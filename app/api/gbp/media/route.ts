/**
 * GBP Media API Route
 *
 * GET /api/gbp/media - Fetches media items for a GBP location.
 * POST /api/gbp/media - Uploads a new media item via URL.
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
    const mediaResponse = await client.getMedia(accountId, locationId, pageToken);

    return NextResponse.json({
      success: true,
      mediaItems: mediaResponse.mediaItems || [],
      totalMediaItemCount: mediaResponse.totalMediaItemCount || 0,
      nextPageToken: mediaResponse.nextPageToken,
    });
  } catch (error) {
    console.error('[API] GBP media error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
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
    const { sourceUrl, category, description } = body;

    if (!sourceUrl) {
      return NextResponse.json(
        { error: 'sourceUrl is required' },
        { status: 400 }
      );
    }

    // Determine media format from URL (basic check)
    const isVideo = /\.(mp4|mov|avi|webm)$/i.test(sourceUrl);
    const mediaFormat = isVideo ? 'VIDEO' : 'PHOTO';

    const client = createGBPClient(accessToken, DEFAULT_ACCOUNT_ID, DEFAULT_LOCATION_ID);

    const mediaData: any = {
      sourceUrl,
      mediaFormat,
    };

    // Add location association category if provided
    if (category) {
      mediaData.locationAssociation = { category };
    }

    // Add description if provided
    if (description) {
      mediaData.description = description;
    }

    const result = await client.createMedia(DEFAULT_ACCOUNT_ID, DEFAULT_LOCATION_ID, mediaData);

    return NextResponse.json({
      success: true,
      media: result,
    });
  } catch (error) {
    console.error('[API] GBP media upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload media',
      },
      { status: 500 }
    );
  }
}
