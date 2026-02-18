/**
 * HubSpot Contacts List API Route
 *
 * Handles listing all contacts using the official HubSpot SDK.
 *
 * GET /api/hubspot/contacts - List all contacts with pagination support
 */

import { NextRequest, NextResponse } from 'next/server';
import { getHubSpotClient } from '@/lib/hubspot-client';

export interface HubSpotContact {
  id: string;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  properties: {
    // Core contact properties
    email?: string | null;
    firstname?: string | null;
    lastname?: string | null;
    phone?: string | null;
    company?: string | null;
    website?: string | null;

    // Address properties
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    country?: string | null;

    // Additional properties
    jobtitle?: string | null;
    lifecyclestage?: string | null;
    hs_lead_status?: string | null;

    // Allow any other HubSpot properties
    [key: string]: string | null | undefined;
  };
}

/**
 * GET - List all contacts
 * Query params:
 *   - limit: Number of contacts to fetch (default: 100, max: 100)
 *   - after: Pagination cursor from previous response
 */
export async function GET(request: NextRequest) {
  console.log('[API /api/hubspot/contacts] GET request - Listing contacts');

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 100);
    const after = searchParams.get('after') || undefined;

    console.log(`[API] Fetching contacts with limit: ${limit}, after: ${after || 'none'}`);

    const client = getHubSpotClient();

    // Fetch contacts with all properties
    const response = await client.crm.contacts.basicApi.getPage(
      limit,
      after,
      undefined, // properties (undefined = all properties)
      undefined, // propertiesWithHistory
      undefined, // associations
      false // archived
    );

    console.log(`[API] Successfully retrieved ${response.results.length} contacts`);

    // Transform to our interface
    const contacts: HubSpotContact[] = response.results.map((contact) => ({
      id: contact.id,
      createdAt: contact.createdAt.toISOString(),
      updatedAt: contact.updatedAt.toISOString(),
      archived: contact.archived || false,
      properties: contact.properties,
    }));

    return NextResponse.json({
      success: true,
      data: contacts,
      paging: response.paging || null,
      timestamp: new Date().toISOString(),
      metadata: {
        totalContacts: contacts.length,
        hasMore: !!response.paging?.next,
        nextCursor: response.paging?.next?.after,
      },
    });

  } catch (error: any) {
    console.error('[API] Error listing contacts:', error);

    // Handle specific error types
    if (error.code === 403 || error.statusCode === 403) {
      return NextResponse.json(
        {
          success: false,
          error: 'Permission denied',
          message: 'Access token does not have permission to read contacts',
        },
        { status: 403 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list contacts',
        message: error.message || 'Unknown error occurred',
        details: error.body || error,
      },
      { status: 500 }
    );
  }
}
