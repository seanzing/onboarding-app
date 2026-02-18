/**
 * GBP Reviews Sync API Endpoint
 *
 * POST /api/sync/gbp-reviews
 *
 * Syncs Google Business Profile reviews to Supabase.
 * Designed to run daily via CRON job.
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
          jobType: 'gbp_reviews',
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

    console.log('[GBP Reviews Sync] Starting sync for location:', locationId);

    // Create sync job record
    const { data: job, error: jobError } = await supabase
      .from('sync_jobs')
      .insert({
        job_type: 'gbp_reviews',
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

    // Fetch all reviews (handle pagination)
    let allReviews: any[] = [];
    let pageToken: string | undefined;
    let pageCount = 0;
    const maxPages = 10; // Safety limit

    do {
      const response = await client.getReviews(accountId, locationId, pageToken);
      const reviews = response.reviews || [];
      allReviews = [...allReviews, ...reviews];
      pageToken = response.nextPageToken;
      pageCount++;

      console.log(`[GBP Reviews Sync] Fetched page ${pageCount}: ${reviews.length} reviews`);
    } while (pageToken && pageCount < maxPages);

    console.log(`[GBP Reviews Sync] Total reviews fetched: ${allReviews.length}`);

    // Process and upsert reviews
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const review of allReviews) {
      try {
        // Extract review ID from name (format: accounts/.../locations/.../reviews/REVIEW_ID)
        const reviewId = review.name?.split('/').pop() || review.reviewId;

        if (!reviewId) {
          console.warn('[GBP Reviews Sync] Review missing ID, skipping');
          skipped++;
          continue;
        }

        // Map Google review to database schema
        const reviewData = {
          account_id: accountId,
          location_id: locationId,
          review_id: reviewId,
          reviewer_display_name: review.reviewer?.displayName,
          reviewer_profile_photo_url: review.reviewer?.profilePhotoUrl,
          star_rating: review.starRating ? parseInt(review.starRating.replace('STAR_RATING_', '').replace('_', '')) : null,
          comment: review.comment,
          reply_comment: review.reviewReply?.comment,
          reply_update_time: review.reviewReply?.updateTime,
          create_time: review.createTime,
          update_time: review.updateTime,
          fetched_at: new Date().toISOString(),
        };

        // Handle star rating enum conversion
        if (review.starRating) {
          const ratingMap: Record<string, number> = {
            'ONE': 1,
            'TWO': 2,
            'THREE': 3,
            'FOUR': 4,
            'FIVE': 5,
          };
          reviewData.star_rating = ratingMap[review.starRating] || null;
        }

        // Upsert (insert or update on conflict)
        const { error: upsertError } = await supabase
          .from('gbp_reviews')
          .upsert(reviewData, {
            onConflict: 'location_id,review_id',
          });

        if (upsertError) {
          console.error('[GBP Reviews Sync] Upsert error:', upsertError);
          errors++;
        } else {
          // Check if this was a create or update
          const { data: existing } = await supabase
            .from('gbp_reviews')
            .select('id')
            .eq('location_id', locationId)
            .eq('review_id', reviewId)
            .single();

          if (existing) {
            updated++;
          } else {
            created++;
          }
        }
      } catch (reviewError: any) {
        console.error('[GBP Reviews Sync] Review processing error:', reviewError);
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
          records_fetched: allReviews.length,
          records_created: created,
          records_updated: updated,
          records_skipped: skipped,
          errors,
          completed_at: new Date().toISOString(),
          duration_ms: durationMs,
        })
        .eq('id', jobId);
    }

    console.log(`[GBP Reviews Sync] ✅ Complete: ${created} created, ${updated} updated, ${skipped} skipped, ${errors} errors (${duration})`);

    return NextResponse.json({
      success: errors === 0,
      jobType: 'gbp_reviews',
      recordsFetched: allReviews.length,
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

    console.error('[GBP Reviews Sync] Error:', error);

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
        jobType: 'gbp_reviews',
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
    message: 'GBP Reviews Sync API',
    method: 'POST',
    description: 'Syncs Google Business Profile reviews to Supabase',
    schedule: 'Daily at 6:00 AM UTC',
    parameters: {
      accountId: 'GBP account ID (optional, defaults to Route36)',
      locationId: 'GBP location ID (optional, defaults to Route36)',
    },
    authorization: 'Requires CRON_SECRET in Authorization header',
    quotaUsage: '1 request per location per sync',
  });
}
