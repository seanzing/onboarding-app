/**
 * GBP Locations Sync API Endpoint
 *
 * POST /api/sync/gbp-locations
 *
 * Syncs Google Business Profile location data to Supabase.
 * Designed to run WEEKLY via CRON job (location info rarely changes).
 *
 * AUTHORIZATION: Protected by CRON_SECRET in Authorization header
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createGBPClient } from '@/lib/gbp/client';
import { getGBPAccessToken } from '@/lib/gbp/token-manager';

// Vercel Pro allows up to 300 seconds for serverless functions
export const maxDuration = 300;

// Default Route36 account ID
const DEFAULT_ACCOUNT_ID = '103378246033774877708';

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
          jobType: 'gbp_locations',
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

    // Get account parameter (optional - defaults to Route36)
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId') || DEFAULT_ACCOUNT_ID;

    console.log('[GBP Locations Sync] Starting sync for account:', accountId);

    // Create sync job record
    const { data: job } = await supabase
      .from('sync_jobs')
      .insert({
        job_type: 'gbp_locations',
        status: 'running',
        metadata: { accountId },
      })
      .select()
      .single();

    if (job) {
      jobId = job.id;
    }

    // Get GBP access token
    const accessToken = await getGBPAccessToken();
    const client = createGBPClient(accessToken, accountId);

    // Fetch all locations for the account
    const response = await client.listLocations(accountId);
    const locations = response.locations || [];

    console.log(`[GBP Locations Sync] Fetched ${locations.length} locations`);

    // Process and upsert locations
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const location of locations) {
      try {
        // Extract location ID from name (format: locations/LOCATION_ID)
        const locationName = location.name;
        const locationId = locationName?.split('/').pop();

        if (!locationId) {
          console.warn('[GBP Locations Sync] Location missing ID, skipping');
          skipped++;
          continue;
        }

        // Try to get detailed location info
        let detailedLocation = location;
        try {
          detailedLocation = await client.getLocation(locationId);
        } catch (detailError) {
          console.warn(`[GBP Locations Sync] Could not fetch details for ${locationId}, using basic info`);
        }

        // Map Google location to database schema
        // Note: Some properties may be returned by API but not in our strict types
        const extendedLocation = detailedLocation as Record<string, any>;
        const extendedMetadata = detailedLocation.metadata as Record<string, any> | undefined;

        const locationData = {
          account_id: accountId,
          location_id: locationId,
          location_name: locationName,
          title: detailedLocation.title,
          store_code: extendedLocation.storeCode ?? null,
          address_lines: detailedLocation.storefrontAddress?.addressLines,
          locality: detailedLocation.storefrontAddress?.locality,
          administrative_area: detailedLocation.storefrontAddress?.administrativeArea,
          postal_code: detailedLocation.storefrontAddress?.postalCode,
          country_code: detailedLocation.storefrontAddress?.regionCode,
          primary_phone: detailedLocation.phoneNumbers?.primaryPhone,
          website_uri: detailedLocation.websiteUri,
          primary_category_id: detailedLocation.categories?.primaryCategory?.name,
          primary_category_name: detailedLocation.categories?.primaryCategory?.displayName,
          additional_categories: detailedLocation.categories?.additionalCategories
            ? JSON.stringify(detailedLocation.categories.additionalCategories)
            : '[]',
          verification_state: detailedLocation.metadata?.hasVoiceOfMerchant ? 'VERIFIED' : 'UNVERIFIED',
          is_open: !extendedLocation.openInfo?.status || extendedLocation.openInfo?.status === 'OPEN',
          metadata: {
            ...detailedLocation.metadata,
            regularHours: detailedLocation.regularHours,
            latlng: detailedLocation.latlng,
          },
          create_time: extendedMetadata?.createTime ?? null,
          update_time: extendedMetadata?.updateTime ?? null,
          fetched_at: new Date().toISOString(),
        };

        // Check if location exists
        const { data: existing } = await supabase
          .from('gbp_locations_sync')
          .select('id')
          .eq('account_id', accountId)
          .eq('location_id', locationId)
          .single();

        if (existing) {
          // Update existing location
          const { error: updateError } = await supabase
            .from('gbp_locations_sync')
            .update(locationData)
            .eq('id', existing.id);

          if (updateError) {
            console.error('[GBP Locations Sync] Update error:', updateError);
            errors++;
          } else {
            updated++;
          }
        } else {
          // Insert new location
          const { error: insertError } = await supabase
            .from('gbp_locations_sync')
            .insert(locationData);

          if (insertError) {
            console.error('[GBP Locations Sync] Insert error:', insertError);
            errors++;
          } else {
            created++;
          }
        }
      } catch (locationError: any) {
        console.error('[GBP Locations Sync] Location processing error:', locationError);
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
          records_fetched: locations.length,
          records_created: created,
          records_updated: updated,
          records_skipped: skipped,
          errors,
          completed_at: new Date().toISOString(),
          duration_ms: durationMs,
        })
        .eq('id', jobId);
    }

    console.log(`[GBP Locations Sync] ✅ Complete: ${created} created, ${updated} updated, ${skipped} skipped, ${errors} errors (${duration})`);

    return NextResponse.json({
      success: errors === 0,
      jobType: 'gbp_locations',
      recordsFetched: locations.length,
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

    console.error('[GBP Locations Sync] Error:', error);

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
        jobType: 'gbp_locations',
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
    message: 'GBP Locations Sync API',
    method: 'POST',
    description: 'Syncs Google Business Profile location data to Supabase',
    schedule: 'Weekly on Sundays at 11:00 AM UTC',
    parameters: {
      accountId: 'GBP account ID (optional, defaults to Route36)',
    },
    authorization: 'Requires CRON_SECRET in Authorization header',
    quotaUsage: '1 + N requests (list + detail per location)',
  });
}
