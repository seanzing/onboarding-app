/**
 * GBP Posts Sync API Endpoint
 *
 * POST /api/sync/gbp-posts
 *
 * Syncs Google Business Profile posts to Supabase.
 * Designed to run WEEKLY via CRON job (posts don't change frequently).
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
          jobType: 'gbp_posts',
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

    console.log('[GBP Posts Sync] Starting sync for location:', locationId);

    // Create sync job record
    const { data: job } = await supabase
      .from('sync_jobs')
      .insert({
        job_type: 'gbp_posts',
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

    // Fetch all posts (handle pagination)
    let allPosts: any[] = [];
    let pageToken: string | undefined;
    let pageCount = 0;
    const maxPages = 10; // Safety limit

    do {
      const response = await client.getLocalPosts(accountId, locationId, pageToken);
      const posts = response.localPosts || [];
      allPosts = [...allPosts, ...posts];
      pageToken = response.nextPageToken;
      pageCount++;

      console.log(`[GBP Posts Sync] Fetched page ${pageCount}: ${posts.length} posts`);
    } while (pageToken && pageCount < maxPages);

    console.log(`[GBP Posts Sync] Total posts fetched: ${allPosts.length}`);

    // Process and upsert posts
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const post of allPosts) {
      try {
        // Extract post name (unique identifier)
        const postName = post.name;

        if (!postName) {
          console.warn('[GBP Posts Sync] Post missing name, skipping');
          skipped++;
          continue;
        }

        // Map Google post to database schema
        const postData = {
          account_id: accountId,
          location_id: locationId,
          post_name: postName,
          summary: post.summary,
          language_code: post.languageCode,
          topic_type: post.topicType,
          call_to_action_type: post.callToAction?.actionType,
          call_to_action_url: post.callToAction?.url,
          event_title: post.event?.title,
          event_start_date: post.event?.schedule?.startDate
            ? `${post.event.schedule.startDate.year}-${String(post.event.schedule.startDate.month).padStart(2, '0')}-${String(post.event.schedule.startDate.day).padStart(2, '0')}`
            : null,
          event_end_date: post.event?.schedule?.endDate
            ? `${post.event.schedule.endDate.year}-${String(post.event.schedule.endDate.month).padStart(2, '0')}-${String(post.event.schedule.endDate.day).padStart(2, '0')}`
            : null,
          offer_coupon_code: post.offer?.couponCode,
          offer_redeem_online_url: post.offer?.redeemOnlineUrl,
          offer_terms_conditions: post.offer?.termsConditions,
          media_url: post.media?.[0]?.googleUrl || post.media?.[0]?.sourceUrl,
          media_format: post.media?.[0]?.mediaFormat,
          state: post.state,
          create_time: post.createTime,
          update_time: post.updateTime,
          fetched_at: new Date().toISOString(),
        };

        // Upsert (insert or update on conflict)
        const { error: upsertError } = await supabase
          .from('gbp_posts')
          .upsert(postData, {
            onConflict: 'location_id,post_name',
          });

        if (upsertError) {
          console.error('[GBP Posts Sync] Upsert error:', upsertError);
          errors++;
        } else {
          created++;
        }
      } catch (postError: any) {
        console.error('[GBP Posts Sync] Post processing error:', postError);
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
          records_fetched: allPosts.length,
          records_created: created,
          records_updated: updated,
          records_skipped: skipped,
          errors,
          completed_at: new Date().toISOString(),
          duration_ms: durationMs,
        })
        .eq('id', jobId);
    }

    console.log(`[GBP Posts Sync] ✅ Complete: ${created} created, ${updated} updated, ${skipped} skipped, ${errors} errors (${duration})`);

    return NextResponse.json({
      success: errors === 0,
      jobType: 'gbp_posts',
      recordsFetched: allPosts.length,
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

    console.error('[GBP Posts Sync] Error:', error);

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
        jobType: 'gbp_posts',
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
    message: 'GBP Posts Sync API',
    method: 'POST',
    description: 'Syncs Google Business Profile posts to Supabase',
    schedule: 'Weekly on Sundays at 9:00 AM UTC',
    parameters: {
      accountId: 'GBP account ID (optional, defaults to Route36)',
      locationId: 'GBP location ID (optional, defaults to Route36)',
    },
    authorization: 'Requires CRON_SECRET in Authorization header',
    quotaUsage: '1 request per location per sync',
  });
}
