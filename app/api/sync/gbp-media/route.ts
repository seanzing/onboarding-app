/**
 * GBP Media Sync API Endpoint
 *
 * POST /api/sync/gbp-media
 *
 * Syncs Google Business Profile photos and videos to Supabase.
 * Designed to run WEEKLY via CRON job (media doesn't change frequently).
 *
 * AUTHORIZATION: Protected by CRON_SECRET in Authorization header
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createGBPClient } from '@/lib/gbp/client';
import { getGBPAccessToken } from '@/lib/gbp/token-manager';

// Vercel Pro allows up to 300 seconds for serverless functions
export const maxDuration = 300;

// Default Route36 account and location IDs
const DEFAULT_ACCOUNT_ID = '103378246033774877708';
const DEFAULT_LOCATION_ID = '3833833563855340375';

interface SyncResult {
  success: boolean;
  jobType: string;
  recordsFetched: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errors: number;
  duration: string;
  timestamp: string;
  errorMessage?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<SyncResult>> {
  const startTime = Date.now();
  let jobId: string | null = null;

  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Validate CRON_SECRET authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        {
          success: false,
          jobType: 'gbp_media',
          recordsFetched: 0,
          recordsCreated: 0,
          recordsUpdated: 0,
          recordsSkipped: 0,
          errors: 1,
          duration: '0s',
          timestamp: new Date().toISOString(),
          errorMessage: 'Unauthorized - Invalid or missing CRON_SECRET',
        },
        { status: 401 }
      );
    }

    // Get location parameters (optional - defaults to Route36)
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId') || DEFAULT_ACCOUNT_ID;
    const locationId = searchParams.get('locationId') || DEFAULT_LOCATION_ID;

    console.log('[GBP Media Sync] Starting sync for location:', locationId);

    // Create sync job record
    const { data: job } = await supabase
      .from('sync_jobs')
      .insert({
        job_type: 'gbp_media',
        status: 'running',
        metadata: { accountId, locationId },
      })
      .select()
      .single();

    if (job) {
      jobId = job.id;
    }

    // Get GBP access token
    const accessToken = await getGBPAccessToken();
    const client = createGBPClient(accessToken, accountId, locationId);

    // Fetch all media (handle pagination)
    let allMedia: any[] = [];
    let pageToken: string | undefined;
    let pageCount = 0;
    const maxPages = 10; // Safety limit

    do {
      const response = await client.getMedia(accountId, locationId, pageToken);
      const mediaItems = response.mediaItems || [];
      allMedia = [...allMedia, ...mediaItems];
      pageToken = response.nextPageToken;
      pageCount++;

      console.log(`[GBP Media Sync] Fetched page ${pageCount}: ${mediaItems.length} media items`);
    } while (pageToken && pageCount < maxPages);

    console.log(`[GBP Media Sync] Total media items fetched: ${allMedia.length}`);

    // Process and upsert media
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const media of allMedia) {
      try {
        // Extract media name (unique identifier)
        const mediaName = media.name;

        if (!mediaName) {
          console.warn('[GBP Media Sync] Media missing name, skipping');
          skipped++;
          continue;
        }

        // Map Google media to database schema
        const mediaData = {
          account_id: accountId,
          location_id: locationId,
          media_name: mediaName,
          media_format: media.mediaFormat, // PHOTO or VIDEO
          location_association: media.locationAssociation?.category,
          google_url: media.googleUrl,
          thumbnail_url: media.thumbnailUrl,
          source_url: media.sourceUrl,
          width_pixels: media.dimensions?.widthPixels,
          height_pixels: media.dimensions?.heightPixels,
          attribution_profile_name: media.attribution?.profileName,
          attribution_profile_url: media.attribution?.profilePhotoUrl,
          view_count: media.insights?.viewCount ? parseInt(media.insights.viewCount) : 0,
          create_time: media.createTime,
          fetched_at: new Date().toISOString(),
        };

        // Upsert (insert or update on conflict)
        const { error: upsertError } = await supabase
          .from('gbp_media')
          .upsert(mediaData, {
            onConflict: 'location_id,media_name',
          });

        if (upsertError) {
          console.error('[GBP Media Sync] Upsert error:', upsertError);
          errors++;
        } else {
          created++;
        }
      } catch (mediaError: any) {
        console.error('[GBP Media Sync] Media processing error:', mediaError);
        errors++;
      }
    }

    // Calculate duration
    const durationMs = Date.now() - startTime;
    const duration = durationMs > 1000 ? `${(durationMs / 1000).toFixed(1)}s` : `${durationMs}ms`;

    // Update sync job record
    if (jobId) {
      await supabase
        .from('sync_jobs')
        .update({
          status: 'completed',
          records_fetched: allMedia.length,
          records_created: created,
          records_updated: updated,
          records_skipped: skipped,
          errors,
          completed_at: new Date().toISOString(),
          duration_ms: durationMs,
        })
        .eq('id', jobId);
    }

    console.log(`[GBP Media Sync] ✅ Complete: ${created} created, ${updated} updated, ${skipped} skipped, ${errors} errors (${duration})`);

    return NextResponse.json({
      success: errors === 0,
      jobType: 'gbp_media',
      recordsFetched: allMedia.length,
      recordsCreated: created,
      recordsUpdated: updated,
      recordsSkipped: skipped,
      errors,
      duration,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    const duration = `${(durationMs / 1000).toFixed(1)}s`;

    console.error('[GBP Media Sync] Error:', error);

    // Update sync job record with error
    if (jobId) {
      await supabase
        .from('sync_jobs')
        .update({
          status: 'failed',
          errors: 1,
          error_message: error.message,
          completed_at: new Date().toISOString(),
          duration_ms: durationMs,
        })
        .eq('id', jobId);
    }

    return NextResponse.json(
      {
        success: false,
        jobType: 'gbp_media',
        recordsFetched: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsSkipped: 0,
        errors: 1,
        duration,
        timestamp: new Date().toISOString(),
        errorMessage: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint for documentation
export async function GET() {
  return NextResponse.json({
    message: 'GBP Media Sync API',
    method: 'POST',
    description: 'Syncs Google Business Profile photos and videos to Supabase',
    schedule: 'Weekly on Sundays at 10:00 AM UTC',
    parameters: {
      accountId: 'GBP account ID (optional, defaults to Route36)',
      locationId: 'GBP location ID (optional, defaults to Route36)',
    },
    authorization: 'Requires CRON_SECRET in Authorization header',
    quotaUsage: '1 request per location per sync',
  });
}
