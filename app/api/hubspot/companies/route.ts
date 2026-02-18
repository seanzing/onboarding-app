/**
 * HubSpot Companies List API (Live API Version)
 *
 * Fetches customer contacts from HubSpot live API and transforms them to company format.
 * FILTERS to only include ACTIVE CUSTOMERS (lifecyclestage="customer")
 *
 * This replaces the CSV-based implementation with live API calls.
 *
 * GET /api/hubspot/companies - List all active customer companies
 * Query params:
 *   - limit: Number to fetch per page (default: 100, max: 100)
 *   - after: Pagination cursor
 *   - all: Set to 'true' to fetch all customers (handles pagination automatically)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getHubSpotClient } from '@/lib/hubspot-client';
import { HubSpotCompany } from '@/app/types/hubspot';
import { FilterOperatorEnum } from '@hubspot/api-client/lib/codegen/crm/contacts';

// Properties to fetch from HubSpot contacts
const CONTACT_PROPERTIES = [
  'email',
  'firstname',
  'lastname',
  'phone',
  'mobilephone',
  'company',
  'website',
  'address',
  'city',
  'state',
  'zip',
  'country',
  'lifecyclestage',
  'active_customer',
  'business_category_type',
  'createdate',
  'lastmodifieddate',
  'hs_object_id',
];

/**
 * Extract domain from website URL
 */
function extractDomain(website: string | null | undefined): string | null {
  if (!website) return null;

  try {
    let domain = website.replace(/^https?:\/\/(www\.)?/, '');
    domain = domain.split('/')[0];
    domain = domain.split(':')[0];
    return domain || null;
  } catch {
    return null;
  }
}

/**
 * Get company name with fallback logic
 */
function getCompanyName(properties: Record<string, string | null>): string {
  if (properties.company && properties.company.trim()) {
    return properties.company.trim();
  }

  const firstName = properties.firstname || '';
  const lastName = properties.lastname || '';
  if (firstName || lastName) {
    return `${firstName} ${lastName}`.trim();
  }

  if (properties.email && properties.email.includes('@')) {
    const username = properties.email.split('@')[0];
    return username.charAt(0).toUpperCase() + username.slice(1);
  }

  return 'Unknown Business';
}

/**
 * Transform HubSpot contact to HubSpotCompany format
 */
function contactToCompany(contact: {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  archived?: boolean;
  properties: Record<string, string | null>;
}): HubSpotCompany {
  const props = contact.properties;
  const name = getCompanyName(props);
  const website = props.website || null;
  const domain = extractDomain(website);

  return {
    id: contact.id,
    name,
    domain,
    website,
    phone: props.phone || props.mobilephone || null,
    email: props.email || null,
    address: props.address || null,
    address2: null,
    city: props.city || null,
    state: props.state || null,
    zip: props.zip || null,
    country: props.country || null,
    description: null,
    industry: props.business_category_type || null,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
    archived: contact.archived || false,
    url: `https://app.hubspot.com/contacts/contacts/${contact.id}`,
  };
}

/**
 * Check if contact is a customer
 */
function isCustomer(properties: Record<string, string | null>): boolean {
  return (
    properties.lifecyclestage === 'customer' ||
    properties.active_customer === 'Yes'
  );
}

export async function GET(request: NextRequest) {
  console.log('[API /api/hubspot/companies] GET request received (Live API mode)');

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 100);
    const after = searchParams.get('after') || undefined;
    const fetchAll = searchParams.get('all') === 'true';

    console.log(`[API] Fetching contacts with limit: ${limit}, after: ${after || 'none'}, fetchAll: ${fetchAll}`);

    const client = getHubSpotClient();
    const allCompanies: HubSpotCompany[] = [];
    let cursor: string | undefined = after;
    let totalFetched = 0;
    let pageCount = 0;
    const maxPages = 50; // Safety limit: 50 pages * 100 = 5000 contacts max

    do {
      pageCount++;
      console.log(`[API] Fetching page ${pageCount}...`);

      // Use search API to filter by lifecyclestage = customer
      const response = await client.crm.contacts.searchApi.doSearch({
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'lifecyclestage',
                operator: FilterOperatorEnum.Eq,
                value: 'customer',
              },
            ],
          },
        ],
        properties: CONTACT_PROPERTIES,
        limit,
        after: cursor || undefined,
        sorts: ['company'], // Sort by company name ascending
      });

      totalFetched += response.results.length;
      console.log(`[API] Retrieved ${response.results.length} contacts (total: ${totalFetched})`);

      // Transform contacts to companies
      for (const contact of response.results) {
        // Double-check customer status (search API should already filter)
        if (isCustomer(contact.properties)) {
          allCompanies.push(
            contactToCompany({
              id: contact.id,
              createdAt: contact.createdAt,
              updatedAt: contact.updatedAt,
              archived: contact.archived,
              properties: contact.properties,
            })
          );
        }
      }

      // Get next cursor for pagination
      cursor = response.paging?.next?.after;

      // Continue fetching if:
      // 1. fetchAll is true
      // 2. There are more pages
      // 3. We haven't hit the safety limit
    } while (fetchAll && cursor && pageCount < maxPages);

    console.log(`[API] Total companies fetched: ${allCompanies.length}`);

    return NextResponse.json({
      success: true,
      data: allCompanies,
      timestamp: new Date().toISOString(),
      paging: cursor
        ? {
            next: {
              after: cursor,
            },
          }
        : null,
      metadata: {
        totalCompanies: allCompanies.length,
        source: 'HubSpot Live API - Customer Contacts',
        filter: 'lifecyclestage=customer',
        hasMore: !!cursor,
        nextCursor: cursor,
        pagesFetched: pageCount,
      },
    });
  } catch (error: unknown) {
    console.error('[API] Error fetching companies from HubSpot:', error);

    // Handle specific error types
    const err = error as { code?: number; statusCode?: number; message?: string; body?: unknown };

    if (err.code === 403 || err.statusCode === 403) {
      return NextResponse.json(
        {
          success: false,
          error: 'Permission denied',
          message: 'Access token does not have permission to read contacts',
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch companies from HubSpot',
        message: err.message || 'Unknown error occurred',
        details: err.body || String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
