/**
 * Test script to verify sync_jobs table data
 * Run with: npx tsx scripts/test-sync-status.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function testSyncStatus() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('\n=== SYNC JOBS ANALYSIS ===\n');

  // 1. Get all job types
  const { data: jobTypes, error: typesError } = await supabase
    .from('sync_jobs')
    .select('job_type')
    .order('job_type');

  if (typesError) {
    console.error('Error fetching job types:', typesError);
    return;
  }

  const uniqueTypes = [...new Set(jobTypes?.map(j => j.job_type) || [])];
  console.log('Job Types Found:', uniqueTypes);

  // 2. Get recent jobs
  const { data: recentJobs, error: recentError } = await supabase
    .from('sync_jobs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(20);

  if (recentError) {
    console.error('Error fetching recent jobs:', recentError);
    return;
  }

  console.log(`\nTotal Recent Jobs: ${recentJobs?.length || 0}\n`);

  // 3. Summary per job type
  console.log('=== SUMMARY PER JOB TYPE ===\n');

  for (const jobType of uniqueTypes) {
    const { data: jobs } = await supabase
      .from('sync_jobs')
      .select('*')
      .eq('job_type', jobType)
      .order('completed_at', { ascending: false })
      .limit(5);

    const lastJob = jobs?.[0];
    const successfulJobs = jobs?.filter(j => j.status === 'completed') || [];
    const lastSuccess = successfulJobs[0];

    console.log(`📊 ${jobType}`);
    console.log(`   Total Jobs (last 5): ${jobs?.length || 0}`);
    console.log(`   Successful: ${successfulJobs.length}`);
    console.log(`   Last Status: ${lastJob?.status || 'N/A'}`);
    console.log(`   Last Completed: ${lastJob?.completed_at || 'N/A'}`);
    if (lastSuccess) {
      console.log(`   Last Success: ${lastSuccess.completed_at}`);
      console.log(`   Records: fetched=${lastSuccess.records_fetched}, created=${lastSuccess.records_created}, updated=${lastSuccess.records_updated}`);
      console.log(`   Duration: ${lastSuccess.duration_ms}ms`);
    }
    console.log('');
  }

  // 4. Recent job details
  console.log('=== RECENT JOBS (Last 10) ===\n');

  const recentTen = (recentJobs || []).slice(0, 10);
  for (const job of recentTen) {
    const status = job.status === 'completed' ? '✅' : job.status === 'failed' ? '❌' : '🔄';
    console.log(`${status} ${job.job_type}`);
    console.log(`   Started: ${job.started_at}`);
    console.log(`   Completed: ${job.completed_at || 'In Progress'}`);
    console.log(`   Records: F=${job.records_fetched} C=${job.records_created} U=${job.records_updated} S=${job.records_skipped}`);
    if (job.error_message) {
      console.log(`   Error: ${job.error_message}`);
    }
    console.log('');
  }

  // 5. Statistics
  const { data: stats } = await supabase
    .from('sync_jobs')
    .select('status')
    .gte('started_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  const total = stats?.length || 0;
  const completed = stats?.filter(s => s.status === 'completed').length || 0;
  const failed = stats?.filter(s => s.status === 'failed').length || 0;
  const running = stats?.filter(s => s.status === 'running').length || 0;

  console.log('=== STATISTICS (Last 7 Days) ===\n');
  console.log(`Total Jobs: ${total}`);
  console.log(`Completed: ${completed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Running: ${running}`);
  console.log(`Success Rate: ${total > 0 ? Math.round((completed / total) * 100) : 0}%`);
}

testSyncStatus().catch(console.error);
