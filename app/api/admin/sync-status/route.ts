/**
 * Sync Status API Endpoint
 *
 * GET /api/admin/sync-status
 *
 * Returns the status of all sync jobs, including:
 * - Last successful sync time per job type
 * - Recent sync history (last 7 days)
 * - Summary statistics
 *
 * Query Parameters:
 * - jobType: Filter to a specific job type (optional)
 * - limit: Number of recent jobs to return (default: 20)
 *
 * AUTHORIZATION: Requires authenticated session (checked by middleware)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Job type descriptions for display
const JOB_TYPE_LABELS: Record<string, string> = {
  gbp_reviews: 'GBP Reviews',
  gbp_analytics: 'GBP Analytics',
  gbp_posts: 'GBP Posts',
  gbp_media: 'GBP Media',
  gbp_locations: 'GBP Locations',
  hubspot_contacts_sync: 'HubSpot Contacts (Full)',
  hubspot_contacts_incremental: 'HubSpot Contacts (Incremental)',
  hubspot_contacts_insert: 'HubSpot Contacts (Insert Only)',
};

// Sync schedules for display (must match vercel.json crons)
const SYNC_SCHEDULES: Record<string, string> = {
  // HubSpot Contacts
  hubspot_contacts_incremental: 'Hourly (0 * * * *)',
  hubspot_contacts_sync: 'Manual or Daily',
  hubspot_contacts_insert: 'Manual only',
  // GBP syncs
  gbp_reviews: 'Daily at 6:00 AM UTC (0 6 * * *)',
  gbp_analytics: 'Weekly Sunday 7:00 AM UTC (0 7 * * 0)',
  gbp_posts: 'Weekly Sunday 9:00 AM UTC (0 9 * * 0)',
  gbp_media: 'Weekly Sunday 10:00 AM UTC (0 10 * * 0)',
  gbp_locations: 'Weekly Sunday 11:00 AM UTC (0 11 * * 0)',
};

interface SyncJobSummary {
  jobType: string;
  label: string;
  schedule: string;
  lastSuccessfulSync: string | null;
  lastStatus: 'completed' | 'failed' | 'running' | null;
  lastDurationMs: number | null;
  totalRecordsLastSync: number | null;
  recentSuccessRate: number; // Percentage of successful syncs in last 7 days
  totalJobsLast7Days: number;
}

interface SyncJob {
  id: string;
  job_type: string;
  status: string;
  records_fetched: number;
  records_created: number;
  records_updated: number;
  records_skipped: number;
  errors: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  metadata: Record<string, any>;
}

export async function GET(request: NextRequest) {
  console.log('[API /api/admin/sync-status] Fetching sync status');

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const jobTypeFilter = searchParams.get('jobType');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Query 1: Get all sync jobs from last 7 days
    let query = supabase
      .from('sync_jobs')
      .select('*')
      .gte('started_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('started_at', { ascending: false });

    if (jobTypeFilter) {
      query = query.eq('job_type', jobTypeFilter);
    }

    const { data: recentJobs, error: recentError } = await query.limit(limit);

    if (recentError) {
      console.error('[API] Error fetching recent jobs:', recentError);
      throw new Error(`Failed to fetch sync jobs: ${recentError.message}`);
    }

    // Query 2: Get latest successful sync per job type
    const { data: allJobs, error: allError } = await supabase
      .from('sync_jobs')
      .select('job_type, status, completed_at, duration_ms, records_fetched, records_created, records_updated')
      .order('completed_at', { ascending: false });

    if (allError) {
      console.error('[API] Error fetching all jobs:', allError);
    }

    // Build summary per job type
    const jobTypeSummaries: Record<string, SyncJobSummary> = {};
    const recentJobsByType: Record<string, SyncJob[]> = {};

    // Initialize with known job types
    for (const jobType of Object.keys(JOB_TYPE_LABELS)) {
      jobTypeSummaries[jobType] = {
        jobType,
        label: JOB_TYPE_LABELS[jobType] || jobType,
        schedule: SYNC_SCHEDULES[jobType] || 'Unknown',
        lastSuccessfulSync: null,
        lastStatus: null,
        lastDurationMs: null,
        totalRecordsLastSync: null,
        recentSuccessRate: 0,
        totalJobsLast7Days: 0,
      };
      recentJobsByType[jobType] = [];
    }

    // Process recent jobs (last 7 days)
    for (const job of (recentJobs || []) as SyncJob[]) {
      const jobType = job.job_type;

      if (!recentJobsByType[jobType]) {
        recentJobsByType[jobType] = [];
        jobTypeSummaries[jobType] = {
          jobType,
          label: JOB_TYPE_LABELS[jobType] || jobType,
          schedule: SYNC_SCHEDULES[jobType] || 'Unknown',
          lastSuccessfulSync: null,
          lastStatus: null,
          lastDurationMs: null,
          totalRecordsLastSync: null,
          recentSuccessRate: 0,
          totalJobsLast7Days: 0,
        };
      }

      recentJobsByType[jobType].push(job);
      jobTypeSummaries[jobType].totalJobsLast7Days++;
    }

    // Calculate success rates and find latest successful sync
    for (const jobType of Object.keys(jobTypeSummaries)) {
      const jobs = recentJobsByType[jobType] || [];
      const successfulJobs = jobs.filter(j => j.status === 'completed');

      if (jobs.length > 0) {
        jobTypeSummaries[jobType].recentSuccessRate =
          Math.round((successfulJobs.length / jobs.length) * 100);

        // Get the most recent job's status
        const mostRecent = jobs[0];
        if (mostRecent) {
          jobTypeSummaries[jobType].lastStatus = mostRecent.status as any;
        }
      }

      // Find most recent successful sync
      if (successfulJobs.length > 0) {
        const latestSuccess = successfulJobs[0];
        jobTypeSummaries[jobType].lastSuccessfulSync = latestSuccess.completed_at;
        jobTypeSummaries[jobType].lastDurationMs = latestSuccess.duration_ms;
        jobTypeSummaries[jobType].totalRecordsLastSync =
          (latestSuccess.records_created || 0) + (latestSuccess.records_updated || 0);
      }
    }

    // Also check allJobs for older successful syncs
    if (allJobs) {
      for (const job of allJobs) {
        const summary = jobTypeSummaries[job.job_type];
        if (summary && !summary.lastSuccessfulSync && job.status === 'completed') {
          summary.lastSuccessfulSync = job.completed_at;
          summary.lastDurationMs = job.duration_ms;
          summary.totalRecordsLastSync =
            (job.records_created || 0) + (job.records_updated || 0);
        }
      }
    }

    // Convert to array and sort by job type
    const summaries = Object.values(jobTypeSummaries)
      .filter(s => s.totalJobsLast7Days > 0 || s.lastSuccessfulSync)
      .sort((a, b) => a.label.localeCompare(b.label));

    // Calculate overall stats
    const totalJobs = (recentJobs || []).length;
    const successfulJobs = (recentJobs || []).filter((j: SyncJob) => j.status === 'completed').length;
    const failedJobs = (recentJobs || []).filter((j: SyncJob) => j.status === 'failed').length;
    const runningJobs = (recentJobs || []).filter((j: SyncJob) => j.status === 'running').length;

    console.log(`[API] Found ${totalJobs} sync jobs, ${summaries.length} job types`);

    return NextResponse.json({
      success: true,
      data: {
        summaries,
        recentJobs: (recentJobs || []).slice(0, limit),
      },
      stats: {
        totalJobsLast7Days: totalJobs,
        successfulJobs,
        failedJobs,
        runningJobs,
        overallSuccessRate: totalJobs > 0 ? Math.round((successfulJobs / totalJobs) * 100) : 0,
      },
      generatedAt: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[API] Error in sync-status:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch sync status',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
