/**
 * Admin Sync Integrations API
 *
 * POST - Trigger sync workflows for integration tables
 *
 * Endpoints:
 * - POST /api/admin/sync-integrations?type=contacts-backfill
 * - POST /api/admin/sync-integrations?type=all
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN!;
const HUBSPOT_API_BASE = 'https://api.hubapi.com';

// ============================================
// Contacts Backfill
// ============================================
async function backfillContactsCompanyId(): Promise<{
  updated: number;
  skipped: number;
  errors: number;
}> {
  const supabase = getSupabaseAdmin();
  console.log('[Sync] Starting contacts hubspot_company_id backfill...');

  const { data: contacts, error: contactsError } = await supabase
    .from('contacts')
    .select('id, hubspot_contact_id, email')
    .is('hubspot_company_id', null)
    .limit(100);

  if (contactsError) {
    throw new Error(`Failed to fetch contacts: ${contactsError.message}`);
  }

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const contact of contacts || []) {
    try {
      if (!contact.hubspot_contact_id) {
        skipped++;
        continue;
      }

      const response = await fetch(
        `${HUBSPOT_API_BASE}/crm/v4/objects/contacts/${contact.hubspot_contact_id}/associations/companies`,
        {
          headers: {
            Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
          },
        }
      );

      if (!response.ok) {
        skipped++;
        continue;
      }

      const data = await response.json();
      const companyId = data.results?.[0]?.toObjectId;

      if (!companyId) {
        skipped++;
        continue;
      }

      const { error } = await supabase
        .from('contacts')
        .update({ hubspot_company_id: companyId })
        .eq('id', contact.id);

      if (error) {
        errors++;
      } else {
        updated++;
      }
    } catch (err) {
      errors++;
    }
  }

  return { updated, skipped, errors };
}

// ============================================
// Main Handler
// ============================================
export async function POST(request: NextRequest) {
  console.log('[API /api/admin/sync-integrations] POST request');

  try {
    const { searchParams } = new URL(request.url);
    const syncType = searchParams.get('type') || 'all';

    const results: Record<string, any> = {};

    if (syncType === 'contacts-backfill' || syncType === 'all') {
      results.contactsBackfill = await backfillContactsCompanyId();
    }

    console.log('[API] Sync complete:', results);

    return NextResponse.json({
      success: true,
      syncType,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API] Sync error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Sync failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Check sync status and counts
 */
export async function GET() {
  const supabase = getSupabaseAdmin();
  console.log('[API /api/admin/sync-integrations] GET request');

  try {
    const { count: contactsCount } = await supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .is('hubspot_company_id', null);

    return NextResponse.json({
      success: true,
      status: {
        contactsWithoutCompanyId: contactsCount || 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
