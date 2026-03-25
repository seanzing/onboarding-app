/**
 * HubSpot Contact Search API Route
 *
 * Searches ALL HubSpot contacts (no lifecycle stage filter) so users can
 * add any business to the onboarding app without going through sync validation.
 *
 * GET /api/hubspot/contacts/search?q=<query>&limit=<limit>
 */

import { NextRequest, NextResponse } from 'next/server';
import { getHubSpotClient } from '@/lib/hubspot-client';

const SEARCH_PROPERTIES = [
  'email',
  'firstname',
  'lastname',
  'phone',
  'company',
  'website',
  'city',
  'state',
  'lifecyclestage',
  'hs_object_id',
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

  if (!query || query.length < 2) {
    return NextResponse.json({
      success: true,
      data: [],
      message: 'Query must be at least 2 characters',
    });
  }

  console.log(`[API /api/hubspot/contacts/search] Searching for "${query}"`);

  try {
    const client = getHubSpotClient();

    // Search across multiple fields with no lifecycle stage filter
    const response = await client.crm.contacts.searchApi.doSearch({
      filterGroups: [],
      query,
      properties: SEARCH_PROPERTIES,
      limit,
      sorts: ['company'],
    });

    const contacts = response.results.map((contact) => ({
      id: contact.id,
      properties: {
        firstname: contact.properties.firstname || null,
        lastname: contact.properties.lastname || null,
        email: contact.properties.email || null,
        phone: contact.properties.phone || null,
        company: contact.properties.company || null,
        website: contact.properties.website || null,
        city: contact.properties.city || null,
        state: contact.properties.state || null,
        lifecyclestage: contact.properties.lifecyclestage || null,
        hs_object_id: contact.properties.hs_object_id || contact.id,
      },
    }));

    console.log(`[API] Found ${contacts.length} contacts for "${query}"`);

    return NextResponse.json({
      success: true,
      data: contacts,
      total: response.total,
    });
  } catch (error: unknown) {
    console.error('[API] HubSpot search error:', error);
    const err = error as { message?: string };

    return NextResponse.json(
      {
        success: false,
        error: 'Search failed',
        message: err.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}