// @ts-nocheck - Supabase client generic types are complex; SDK types don't match runtime behavior
/**
 * HubSpot Contact Sync API Route
 *
 * Fetches fresh data from HubSpot for a specific contact,
 * updates Supabase, and returns the synced data.
 *
 * GET /api/hubspot/contacts/[id]/sync - Manually trigger sync for a contact
 * POST /api/hubspot/contacts/[id]/sync - Called after HubSpot updates (async)
 *
 * ARCHITECTURE:
 * - Accepts EITHER Supabase UUID OR HubSpot numeric ID
 * - If UUID provided, looks up hs_object_id from Supabase first
 * - HubSpot is source of truth for contact data
 * - Supabase is read cache (one-way sync)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Detect if a string is a UUID (Supabase format) vs numeric (HubSpot format)
 * UUID format: 8-4-4-4-12 hex characters with dashes
 */
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Lookup HubSpot Object ID from Supabase using the UUID
 * Returns { supabaseId, hubspotId } or throws error if not found
 */
async function resolveContactIds(
  providedId: string,
  supabase: ReturnType<typeof createClient>
): Promise<{ supabaseId: string; hubspotId: string }> {
  if (isUUID(providedId)) {
    // It's a Supabase UUID - lookup the HubSpot ID
    console.log(`[API] Detected UUID format, looking up hs_object_id from Supabase...`);

    const { data: contact, error } = await supabase
      .from('contacts')
      .select('id, hs_object_id')
      .eq('id', providedId)
      .single();

    if (error || !contact) {
      throw new Error(`Contact not found in Supabase with UUID: ${providedId}`);
    }

    if (!contact.hs_object_id) {
      throw new Error(`Contact ${providedId} has no hs_object_id - cannot sync from HubSpot`);
    }

    console.log(`[API] Resolved: UUID ${providedId} -> HubSpot ID ${contact.hs_object_id}`);
    return { supabaseId: providedId, hubspotId: contact.hs_object_id };
  } else {
    // It's already a HubSpot numeric ID
    console.log(`[API] Detected numeric HubSpot ID format`);

    // Check if this contact exists in Supabase by hs_object_id
    const { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .eq('hs_object_id', providedId)
      .single();

    // If exists, use that Supabase ID; otherwise, HubSpot ID will be used
    // (new contact will be created with UUID on insert)
    return {
      supabaseId: contact?.id || '', // Empty means new contact
      hubspotId: providedId
    };
  }
}

// Use environment variable for HubSpot token (NEVER hardcode!)
// IMPORTANT: Must use HUBSPOT_ACCESS_TOKEN to be consistent with all other HubSpot routes
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

const CONTACT_PROPERTIES = [
  'firstname',
  'lastname',
  'email',
  'phone',
  'mobilephone',
  'company',
  'business_type',
  'business_category_type',
  'business_hours',
  'current_website',
  'website',
  'website_status',
  'address',
  'city',
  'state',
  'zip',
  'country',
  'active_customer',
  'gbp_ready',
  'published_status',
  'publishing_fee_paid',
  'completeness_score',
  'lifecyclestage',
  'createdate',
  'lastmodifieddate',
  // Social media
  'twitterhandle',
  'facebook_company_page',
  'linkedin_company_page',
  // Business details
  'payment_methods_accepted',
  'business_email_address',
];

interface HubSpotContact {
  id: string;
  properties: Record<string, string | undefined>;
  createdAt?: string;
  updatedAt?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const providedId = resolvedParams.id;

  console.log(`[API /api/hubspot/contacts/${providedId}/sync] Syncing contact from HubSpot`);

  try {
    // Validate token exists
    if (!HUBSPOT_ACCESS_TOKEN) {
      throw new Error('Missing HUBSPOT_ACCESS_TOKEN environment variable');
    }

    // Step 1: Initialize Supabase client FIRST (needed for ID resolution)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials (need SERVICE_ROLE_KEY for server operations)');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('[API] Using Supabase service role for server-side sync');

    // Step 2: Resolve IDs - convert Supabase UUID to HubSpot ID if needed
    const { supabaseId, hubspotId } = await resolveContactIds(providedId, supabase);
    console.log(`[API] ID Resolution: supabaseId=${supabaseId || '(new)'}, hubspotId=${hubspotId}`);

    // Step 3: Fetch from HubSpot API using the NUMERIC HubSpot ID
    console.log(`[API] Fetching contact ${hubspotId} from HubSpot...`);
    const hubspotUrl = `https://api.hubapi.com/crm/v3/objects/contacts/${hubspotId}`;
    const hubspotParams = new URLSearchParams({
      properties: CONTACT_PROPERTIES.join(','),
      archived: 'false',
    });

    const hubspotResponse = await fetch(`${hubspotUrl}?${hubspotParams.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!hubspotResponse.ok) {
      const errorText = await hubspotResponse.text();
      throw new Error(`HubSpot API error (${hubspotResponse.status}): ${errorText}`);
    }

    const contact: HubSpotContact = await hubspotResponse.json();
    console.log(`[API] Fetched contact from HubSpot: ${contact.properties.firstname} ${contact.properties.lastname}`);

    // For now, use a default system user ID for synced records
    const systemUserId = process.env.SYSTEM_USER_ID || '00000000-0000-0000-0000-000000000000';

    // Step 4: Check if contact already exists in Supabase (by UUID or hs_object_id)
    console.log('[API] Checking if contact exists in Supabase...');
    const lookupField = supabaseId ? 'id' : 'hs_object_id';
    const lookupValue = supabaseId || hubspotId;

    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id, lifecyclestage, user_id')
      .eq(lookupField, lookupValue)
      .single();

    // Use existing Supabase ID or generate new one
    const finalSupabaseId = existingContact?.id || supabaseId || crypto.randomUUID();

    // Preserve lifecyclestage="customer" if it's already set, otherwise use HubSpot value
    const lifecyclestage = existingContact?.lifecyclestage === 'customer'
      ? 'customer'
      : (contact.properties.lifecyclestage || null);

    console.log(`[API] Lifecyclestage: existing="${existingContact?.lifecyclestage}", hubspot="${contact.properties.lifecyclestage}", using="${lifecyclestage}"`);

    // Step 5: Transform and upsert to Supabase
    // Preserve existing user_id if contact exists, otherwise use system user
    const userId = existingContact?.user_id || systemUserId;
    console.log(`[API] Upserting to Supabase (id: ${finalSupabaseId}, hs_object_id: ${hubspotId}, user_id: ${userId})...`);

    // CRITICAL: id is Supabase UUID, hs_object_id is HubSpot numeric ID
    // ALSO: hubspot_contact_id is required (NOT NULL constraint) and must match hs_object_id
    const supabaseContact = {
      id: finalSupabaseId,
      hs_object_id: hubspotId,
      hubspot_contact_id: hubspotId, // Required: NOT NULL constraint in contacts table
      firstname: contact.properties.firstname || null,
      lastname: contact.properties.lastname || null,
      email: contact.properties.email || null,
      phone: contact.properties.phone || null,
      mobilephone: contact.properties.mobilephone || null,
      company: contact.properties.company || null,
      business_type: contact.properties.business_type || null,
      business_category_type: contact.properties.business_category_type || null,
      business_hours: contact.properties.business_hours || null,
      current_website: contact.properties.current_website || null,
      website: contact.properties.website || null,
      website_status: contact.properties.website_status || null,
      address: contact.properties.address || null,
      city: contact.properties.city || null,
      state: contact.properties.state || null,
      zip: contact.properties.zip || null,
      country: contact.properties.country || null,
      active_customer: contact.properties.active_customer || null,
      gbp_ready: contact.properties.gbp_ready || null,
      published_status: contact.properties.published_status || null,
      publishing_fee_paid: contact.properties.publishing_fee_paid || null,
      completeness_score: contact.properties.completeness_score
        ? parseFloat(contact.properties.completeness_score)
        : null,
      lifecyclestage: lifecyclestage,
      createdate: contact.properties.createdate || contact.createdAt || null,
      lastmodifieddate: contact.properties.lastmodifieddate || contact.updatedAt || null,
      synced_at: new Date().toISOString(),
      user_id: userId,
    };

    const { data: upsertData, error: upsertError } = await supabase
      .from('contacts')
      .upsert(supabaseContact, {
        onConflict: 'id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (upsertError) {
      throw new Error(`Supabase upsert failed: ${upsertError.message}`);
    }

    // Fetch duda_site_code from associated deals
    try {
      const assocResponse = await fetch(
        `https://api.hubapi.com/crm/v3/objects/contacts/${hubspotId}/associations/deals`,
        { headers: { 'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}` } }
      );
      if (assocResponse.ok) {
        const assocData = await assocResponse.json();
        const dealIds: string[] = (assocData.results || []).map((r: { id: string }) => r.id);

        if (dealIds.length > 0) {
          // Fetch deals with duda_site_code property
          const dealParams = new URLSearchParams({ properties: 'duda_site_code' });
          for (const dealId of dealIds) {
            const dealResponse = await fetch(
              `https://api.hubapi.com/crm/v3/objects/deals/${dealId}?${dealParams}`,
              { headers: { 'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}` } }
            );
            if (!dealResponse.ok) continue;
            const deal = await dealResponse.json();
            const dudaSiteCode = deal.properties?.duda_site_code;
            if (dudaSiteCode) {
              const { error: identityError } = await supabase
                .from('service_identity_map')
                .upsert(
                  { hubspot_contact_id: hubspotId, duda_site_code: dudaSiteCode },
                  { onConflict: 'hubspot_contact_id' }
                );
              if (identityError) {
                console.warn('[API] Failed to sync duda_site_code to identity map:', identityError);
              } else {
                console.log(`[API] Synced duda_site_code "${dudaSiteCode}" from deal ${dealId}`);
              }
              break; // Use first deal that has a duda_site_code
            }
          }
        }
      }
    } catch (dealError) {
      console.warn('[API] Failed to fetch deals for duda_site_code:', dealError);
    }

    console.log('[API] Successfully synced contact');

    return NextResponse.json({
      success: true,
      data: upsertData,
      message: 'Contact synced successfully from HubSpot to Supabase',
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[API] Error syncing contact:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync contact from HubSpot',
        message: error.message || 'Unknown error occurred',
        details: error,
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Triggered after HubSpot updates to sync changes to Supabase
 *
 * This is called as fire-and-forget from the contact update route.
 * It fetches fresh data from HubSpot and upserts to Supabase.
 *
 * ARCHITECTURE: Same as GET - accepts UUID or HubSpot ID, resolves appropriately
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const providedId = resolvedParams.id;

  console.log(`[API /api/hubspot/contacts/${providedId}/sync] POST - Async sync after HubSpot update`);

  // Reuse the same sync logic as GET
  // This just provides a POST endpoint for the fire-and-forget pattern
  try {
    if (!HUBSPOT_ACCESS_TOKEN) {
      throw new Error('Missing HUBSPOT_ACCESS_TOKEN environment variable');
    }

    // Step 1: Initialize Supabase FIRST (needed for ID resolution)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('[API POST] Using Supabase service role for server-side sync');

    // Step 2: Resolve IDs - convert Supabase UUID to HubSpot ID if needed
    const { supabaseId, hubspotId } = await resolveContactIds(providedId, supabase);
    console.log(`[API POST] ID Resolution: supabaseId=${supabaseId || '(new)'}, hubspotId=${hubspotId}`);

    // Step 3: Fetch fresh data from HubSpot using NUMERIC HubSpot ID
    console.log(`[API POST] Fetching contact ${hubspotId} from HubSpot...`);
    const hubspotUrl = `https://api.hubapi.com/crm/v3/objects/contacts/${hubspotId}`;
    const hubspotParams = new URLSearchParams({
      properties: CONTACT_PROPERTIES.join(','),
      archived: 'false',
    });

    const hubspotResponse = await fetch(`${hubspotUrl}?${hubspotParams.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!hubspotResponse.ok) {
      const errorText = await hubspotResponse.text();
      throw new Error(`HubSpot API error (${hubspotResponse.status}): ${errorText}`);
    }

    const contact: HubSpotContact = await hubspotResponse.json();
    console.log(`[API POST] Fetched: ${contact.properties.firstname} ${contact.properties.lastname}`);

    const systemUserId = process.env.SYSTEM_USER_ID || '00000000-0000-0000-0000-000000000000';

    // Step 4: Check existing contact using resolved Supabase ID or hs_object_id
    const lookupField = supabaseId ? 'id' : 'hs_object_id';
    const lookupValue = supabaseId || hubspotId;

    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id, lifecyclestage, user_id')
      .eq(lookupField, lookupValue)
      .single();

    // Use existing Supabase ID or generate new one
    const finalSupabaseId = existingContact?.id || supabaseId || crypto.randomUUID();

    const lifecyclestage = existingContact?.lifecyclestage === 'customer'
      ? 'customer'
      : (contact.properties.lifecyclestage || null);

    const userId = existingContact?.user_id || systemUserId;

    console.log(`[API POST] Lifecyclestage: existing="${existingContact?.lifecyclestage}", hubspot="${contact.properties.lifecyclestage}", using="${lifecyclestage}"`);

    // Step 5: Upsert to Supabase
    // CRITICAL: id is Supabase UUID, hs_object_id is HubSpot numeric ID
    // ALSO: hubspot_contact_id is required (NOT NULL constraint) and must match hs_object_id
    const supabaseContact = {
      id: finalSupabaseId,
      hs_object_id: hubspotId,
      hubspot_contact_id: hubspotId, // Required: NOT NULL constraint in contacts table
      firstname: contact.properties.firstname || null,
      lastname: contact.properties.lastname || null,
      email: contact.properties.email || null,
      phone: contact.properties.phone || null,
      mobilephone: contact.properties.mobilephone || null,
      company: contact.properties.company || null,
      business_type: contact.properties.business_type || null,
      business_category_type: contact.properties.business_category_type || null,
      business_hours: contact.properties.business_hours || null,
      current_website: contact.properties.current_website || null,
      website: contact.properties.website || null,
      website_status: contact.properties.website_status || null,
      address: contact.properties.address || null,
      city: contact.properties.city || null,
      state: contact.properties.state || null,
      zip: contact.properties.zip || null,
      country: contact.properties.country || null,
      active_customer: contact.properties.active_customer || null,
      gbp_ready: contact.properties.gbp_ready || null,
      published_status: contact.properties.published_status || null,
      publishing_fee_paid: contact.properties.publishing_fee_paid || null,
      completeness_score: contact.properties.completeness_score
        ? parseFloat(contact.properties.completeness_score)
        : null,
      lifecyclestage: lifecyclestage,
      createdate: contact.properties.createdate || contact.createdAt || null,
      lastmodifieddate: contact.properties.lastmodifieddate || contact.updatedAt || null,
      synced_at: new Date().toISOString(),
      user_id: userId,
    };

    const { error: upsertError } = await supabase
      .from('contacts')
      .upsert(supabaseContact, {
        onConflict: 'id',
        ignoreDuplicates: false,
      });

    if (upsertError) {
      throw new Error(`Supabase upsert failed: ${upsertError.message}`);
    }

    // Fetch duda_site_code from associated deals
    try {
      const assocResponse = await fetch(
        `https://api.hubapi.com/crm/v3/objects/contacts/${hubspotId}/associations/deals`,
        { headers: { 'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}` } }
      );
      if (assocResponse.ok) {
        const assocData = await assocResponse.json();
        const dealIds: string[] = (assocData.results || []).map((r: { id: string }) => r.id);

        if (dealIds.length > 0) {
          const dealParams = new URLSearchParams({ properties: 'duda_site_code' });
          for (const dealId of dealIds) {
            const dealResponse = await fetch(
              `https://api.hubapi.com/crm/v3/objects/deals/${dealId}?${dealParams}`,
              { headers: { 'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}` } }
            );
            if (!dealResponse.ok) continue;
            const deal = await dealResponse.json();
            const dudaSiteCode = deal.properties?.duda_site_code;
            if (dudaSiteCode) {
              const { error: identityError } = await supabase
                .from('service_identity_map')
                .upsert(
                  { hubspot_contact_id: hubspotId, duda_site_code: dudaSiteCode },
                  { onConflict: 'hubspot_contact_id' }
                );
              if (identityError) {
                console.warn('[API POST] Failed to sync duda_site_code to identity map:', identityError);
              } else {
                console.log(`[API POST] Synced duda_site_code "${dudaSiteCode}" from deal ${dealId}`);
              }
              break;
            }
          }
        }
      }
    } catch (dealError) {
      console.warn('[API POST] Failed to fetch deals for duda_site_code:', dealError);
    }

    console.log(`[API POST] ✅ Sync completed for contact ${providedId} (HubSpot ID: ${hubspotId})`);

    return NextResponse.json({
      success: true,
      message: 'Contact synced to Supabase',
      contactId: providedId,
      hubspotId,
      supabaseId: finalSupabaseId,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error(`[API POST] Error syncing contact ${providedId}:`, error);

    // Log to sync_logs table for retry (if it exists)
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase.from('sync_logs').insert({
          entity_type: 'contact',
          entity_id: providedId,
          operation: 'sync',
          status: 'failed',
          error_message: error.message,
          created_at: new Date().toISOString(),
        });
      }
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Sync failed',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
