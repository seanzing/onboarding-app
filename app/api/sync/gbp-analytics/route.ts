/**
 * GBP Analytics Sync API Endpoint
 *
 * POST /api/sync/gbp-analytics
 *
 * Syncs Google Business Profile search keywords and performance metrics to Supabase.
 * Creates daily snapshots for historical tracking.
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

// Default Route36 location ID
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
  analytics?: {
    totalKeywords: number;
    totalImpressions: number;
    topKeywords: Array<{ keyword: string; impressions: number }>;
  };
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
          jobType: 'gbp_analytics',
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

    // Get location parameter (optional - defaults to Route36)
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId') || DEFAULT_LOCATION_ID;

    console.log('[GBP Analytics Sync] Starting sync for location:', locationId);

    // Create sync job record
    const { data: job } = await supabase
      .from('sync_jobs')
      .insert({
        job_type: 'gbp_analytics',
        status: 'running',
        metadata: { locationId },
      })
      .select()
      .single();

    if (job) {
      jobId = job.id;
    }

    // Get GBP access token
    const accessToken = await getGBPAccessToken();
    const client = createGBPClient(accessToken);

    // Calculate date range (last 3 months of data)
    const now = new Date();
    const startYear = now.getFullYear();
    const startMonth = Math.max(1, now.getMonth() - 2); // 3 months ago
    const endYear = now.getFullYear();
    const endMonth = now.getMonth() + 1; // Current month (1-indexed)

    console.log(`[GBP Analytics Sync] Fetching keywords for ${startYear}-${startMonth} to ${endYear}-${endMonth}`);

    // Fetch search keywords
    const keywordsResponse = await client.getSearchKeywords(
      locationId,
      { year: startYear, month: startMonth },
      { year: endYear, month: endMonth }
    );

    // Process keywords
    const keywords = (keywordsResponse.searchKeywordsCounts || [])
      .map((kw: any) => ({
        keyword: kw.searchKeyword,
        impressions: parseInt(kw.insightsValue?.value || '0'),
        threshold: kw.insightsValue?.threshold,
      }))
      .sort((a: any, b: any) => b.impressions - a.impressions);

    const totalImpressions = keywords.reduce((sum: number, kw: any) => sum + kw.impressions, 0);

    console.log(`[GBP Analytics Sync] Fetched ${keywords.length} keywords, ${totalImpressions} total impressions`);

    // Create daily snapshot
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format

    const snapshotData = {
      location_id: locationId,
      snapshot_date: today,
      date_range_start: `${startYear}-${String(startMonth).padStart(2, '0')}-01`,
      date_range_end: `${endYear}-${String(endMonth).padStart(2, '0')}-01`,
      total_impressions: totalImpressions,
      total_keywords: keywords.length,
      keywords: JSON.stringify(keywords), // Store as JSONB
      fetched_at: new Date().toISOString(),
    };

    // Upsert snapshot (one per location per day)
    const { error: upsertError, data: upsertResult } = await supabase
      .from('gbp_analytics_snapshots')
      .upsert(snapshotData, {
        onConflict: 'location_id,snapshot_date',
      })
      .select();

    let created = 0;
    let updated = 0;
    let errors = 0;

    if (upsertError) {
      console.error('[GBP Analytics Sync] Upsert error:', upsertError);
      errors = 1;
    } else {
      // Check if this was a create or update by looking at existing record
      const { data: existing } = await supabase
        .from('gbp_analytics_snapshots')
        .select('id, fetched_at')
        .eq('location_id', locationId)
        .eq('snapshot_date', today)
        .single();

      // If fetched_at is very recent (within last minute), it was likely an update
      if (existing) {
        const fetchedAt = new Date(existing.fetched_at);
        const timeDiff = now.getTime() - fetchedAt.getTime();
        if (timeDiff < 60000) {
          // Less than 1 minute ago - this was our upsert
          created = 1;
        } else {
          updated = 1;
        }
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
          status: errors > 0 ? 'failed' : 'completed',
          records_fetched: keywords.length,
          records_created: created,
          records_updated: updated,
          records_skipped: 0,
          errors,
          completed_at: new Date().toISOString(),
          duration_ms: durationMs,
          metadata: {
            locationId,
            totalKeywords: keywords.length,
            totalImpressions,
            topKeywords: keywords.slice(0, 5),
          },
        })
        .eq('id', jobId);
    }

    console.log(`[GBP Analytics Sync] ✅ Complete: ${keywords.length} keywords, ${totalImpressions} impressions (${duration})`);

    return NextResponse.json({
      success: errors === 0,
      jobType: 'gbp_analytics',
      recordsFetched: keywords.length,
      recordsCreated: created,
      recordsUpdated: updated,
      recordsSkipped: 0,
      errors,
      duration,
      timestamp: new Date().toISOString(),
      analytics: {
        totalKeywords: keywords.length,
        totalImpressions,
        topKeywords: keywords.slice(0, 10),
      },
    });

  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    const duration = `${(durationMs / 1000).toFixed(1)}s`;

    console.error('[GBP Analytics Sync] Error:', error);

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
        jobType: 'gbp_analytics',
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
    message: 'GBP Analytics Sync API',
    method: 'POST',
    description: 'Syncs Google Business Profile search keywords to Supabase as daily snapshots',
    schedule: 'Weekly on Sundays at 7:00 AM UTC',
    parameters: {
      locationId: 'GBP location ID (optional, defaults to Route36)',
    },
    authorization: 'Requires CRON_SECRET in Authorization header',
    quotaUsage: '1 request per location per sync',
    dataStored: [
      'Daily keyword impressions',
      'Total impression counts',
      'Historical trend data',
    ],
  });
}
