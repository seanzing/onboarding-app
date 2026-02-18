/**
 * HubSpot Contact API Route
 *
 * Handles reading and updating individual contacts by ID.
 *
 * GET /api/hubspot/contacts/[id] - Read contact details
 * PATCH /api/hubspot/contacts/[id] - Update contact properties
 */

import { NextRequest, NextResponse } from 'next/server';
import { getHubSpotClient } from '@/lib/hubspot-client';

/**
 * GET - Read a contact by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contactId } = await params;

  console.log(`[API /api/hubspot/contacts/${contactId}] GET request - Reading contact`);

  try {
    const client = getHubSpotClient();

    // Fetch contact with all properties
    const contact = await client.crm.contacts.basicApi.getById(
      contactId,
      undefined, // properties (undefined = all properties)
      undefined, // propertiesWithHistory
      undefined, // associations
      false // archived
    );

    console.log(`[API] Successfully retrieved contact ${contactId}`);
    console.log(`[API] Contact data:`, JSON.stringify(contact, null, 2));

    return NextResponse.json({
      success: true,
      contact: contact,
      properties: contact.properties,
    });

  } catch (error: any) {
    console.error(`[API] Error reading contact ${contactId}:`, error);

    // Handle specific error types
    if (error.code === 404 || error.statusCode === 404) {
      return NextResponse.json(
        {
          success: false,
          error: 'Contact not found',
          message: `Contact with ID ${contactId} does not exist`,
        },
        { status: 404 }
      );
    }

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
        error: 'Failed to read contact',
        message: error.message || 'Unknown error occurred',
        details: error.body || error,
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update a contact by ID
 *
 * NEW ARCHITECTURE (Single Write Path):
 * 1. Write to HubSpot ONLY (source of truth)
 * 2. Trigger async sync to Supabase (fire-and-forget)
 * 3. Return success immediately after HubSpot update
 *
 * This eliminates race conditions and rollback failures from dual-write.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const contactId = resolvedParams.id;

  console.log(`[API /api/hubspot/contacts/${contactId}] PATCH request - Single write to HubSpot`);

  try {
    const body = await request.json();
    const { properties } = body;

    if (!properties || typeof properties !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          message: 'Request body must contain a "properties" object',
        },
        { status: 400 }
      );
    }

    console.log(`[API] Updating HubSpot contact ${contactId}`);
    console.log(`[API] Properties to update:`, Object.keys(properties));

    // Get HubSpot client
    const hubspotClient = getHubSpotClient();

    // Clean properties - HubSpot API only accepts string values
    const cleanProperties: { [key: string]: string } = {};
    Object.entries(properties).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        cleanProperties[key] = String(value);
      }
    });

    // STEP 1: Write to HubSpot ONLY (source of truth)
    await hubspotClient.crm.contacts.basicApi.update(contactId, {
      properties: cleanProperties,
    });

    console.log(`[API] ✅ HubSpot update succeeded for contact ${contactId}`);

    // STEP 2: Trigger async sync to Supabase (fire-and-forget)
    // This ensures Supabase cache stays updated, but doesn't block the response
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3007';
    fetch(`${appUrl}/api/hubspot/contacts/${contactId}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch((syncError) => {
      // Log but don't fail - HubSpot is source of truth
      console.warn(`[API] Async sync to Supabase failed (will retry):`, syncError.message);
    });

    // STEP 3: Return success immediately
    return NextResponse.json({
      success: true,
      message: 'Contact updated in HubSpot. Syncing to database...',
      hubspotUpdated: true,
      updatedProperties: cleanProperties,
    });

  } catch (error: any) {
    console.error(`[API] Error updating contact ${contactId}:`, error);

    // Handle specific error types
    if (error.code === 404 || error.statusCode === 404) {
      return NextResponse.json(
        {
          success: false,
          error: 'Contact not found',
          message: `Contact with ID ${contactId} does not exist`,
        },
        { status: 404 }
      );
    }

    if (error.code === 403 || error.statusCode === 403) {
      return NextResponse.json(
        {
          success: false,
          error: 'Permission denied',
          message: 'Access token does not have permission to update contacts',
        },
        { status: 403 }
      );
    }

    if (error.code === 400 || error.statusCode === 400) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid properties',
          message: 'One or more properties are invalid or do not exist',
          details: error.body || error.message,
        },
        { status: 400 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update contact',
        message: error.message || 'Unknown error occurred',
        details: error.body || error,
      },
      { status: 500 }
    );
  }
}
