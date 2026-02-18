/**
 * Related Profiles API
 *
 * Fetches all related profiles for a given HubSpot contact ID
 * Includes: Contact, Client, BrightLocal locations, GBP locations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy initialization - create Supabase client only at runtime, not build time
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  try {
    const searchParams = request.nextUrl.searchParams;
    const hubspotContactId = searchParams.get('hubspot_contact_id');

    if (!hubspotContactId) {
      return NextResponse.json(
        { error: 'hubspot_contact_id parameter required' },
        { status: 400 }
      );
    }

    console.log(`[RelatedProfiles] Fetching profiles for hubspot_contact_id: ${hubspotContactId}`);

    // Fetch contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, hs_object_id, hubspot_contact_id, firstname, lastname, company, email')
      .eq('hubspot_contact_id', hubspotContactId)
      .single();

    if (contactError && contactError.code !== 'PGRST116') {
      console.error('[RelatedProfiles] Contact error:', contactError);
    }

    // Fetch client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, business_name, status, hubspot_contact_id')
      .eq('hubspot_contact_id', hubspotContactId)
      .single();

    if (clientError && clientError.code !== 'PGRST116') {
      console.error('[RelatedProfiles] Client error:', clientError);
    }

    // Fetch BrightLocal locations
    const { data: blLocations, error: blError } = await supabase
      .from('brightlocal_locations')
      .select('id, brightlocal_location_id, business_name, hubspot_company_id')
      .eq('hubspot_company_id', hubspotContactId);

    if (blError) {
      console.error('[RelatedProfiles] BrightLocal error:', blError);
    }

    // Fetch enriched business data
    const { data: enrichedBusiness, error: enrichedError } = await supabase
      .from('enriched_businesses')
      .select('id, business_name, hubspot_contact_id, city, state')
      .eq('hubspot_contact_id', hubspotContactId)
      .single();

    if (enrichedError && enrichedError.code !== 'PGRST116') {
      console.error('[RelatedProfiles] Enriched business error:', enrichedError);
    }

    // Note: GBP locations are now fetched live from Google API via /api/gbp/[accountId]/locations
    // No longer stored locally in gbp_locations table

    const response = {
      hubspot_contact_id: hubspotContactId,
      contact: contact || null,
      client: client || null,
      enriched_business: enrichedBusiness || null,
      brightlocal_locations: blLocations || [],
      counts: {
        contact: contact ? 1 : 0,
        client: client ? 1 : 0,
        enriched: enrichedBusiness ? 1 : 0,
        brightlocal: blLocations?.length || 0,
        total: (contact ? 1 : 0) + (client ? 1 : 0) + (enrichedBusiness ? 1 : 0) + (blLocations?.length || 0)
      }
    };

    console.log(`[RelatedProfiles] Found ${response.counts.total} related profiles`);

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[RelatedProfiles] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch related profiles' },
      { status: 500 }
    );
  }
}
