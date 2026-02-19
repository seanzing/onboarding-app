/**
 * Supabase Contacts List API Route
 *
 * Handles listing all contacts from Supabase database.
 * Mimics the structure of /api/hubspot/contacts for compatibility.
 *
 * GET /api/supabase/contacts - List all customer contacts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export interface HubSpotContact {
  id: string;
  hs_object_id?: string; // HubSpot object ID for URL routing
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

    // Allow any other properties
    [key: string]: string | null | undefined;
  };
}

interface SupabaseContact {
  id: string;
  hs_object_id?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  phone?: string;
  mobilephone?: string;
  company?: string;
  business_type?: string;
  business_category_type?: string;
  business_hours?: string;
  current_website?: string;
  website?: string;
  website_status?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  locations?: any;
  active_customer?: string;
  gbp_ready?: string;
  published_status?: string;
  publishing_fee_paid?: string;
  completeness_score?: number;
  lifecyclestage?: string;
  createdate?: string;
  lastmodifieddate?: string;
  synced_at?: string;
  user_id?: string;
}

/**
 * GET - List all customer contacts from Supabase
 */
export async function GET(request: NextRequest) {
  console.log('[API /api/supabase/contacts] GET request - Listing contacts from Supabase');

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    console.log('[API] Authenticating with Supabase...');

    // Validate required credentials (no fallbacks for security)
    const testEmail = process.env.TEST_EMAIL;
    const testPassword = process.env.TEST_PASSWORD;

    if (!testEmail || !testPassword) {
      console.error('[API] Missing TEST_EMAIL or TEST_PASSWORD environment variables');
      throw new Error('Server configuration error: Missing authentication credentials');
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (authError) {
      throw new Error(`Supabase auth failed: ${authError.message}`);
    }

    const userId = authData.user.id;
    console.log(`[API] Authenticated as: ${authData.user.email}`);

    console.log('[API] Fetching ALL customer contacts from Supabase (with pagination)...');

    // Fetch ALL contacts using pagination (Supabase default limit is 1000)
    let allContacts: SupabaseContact[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      console.log(`[API] Fetching batch: ${from} to ${from + pageSize - 1}`);

      const { data: contacts, error, count } = await supabase
        .from('contacts')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .in('lifecyclestage', ['customer', 'dnc', 'active']) // Active customer lifecycle stages
        .order('synced_at', { ascending: false, nullsFirst: false })
        .range(from, from + pageSize - 1);

      if (error) {
        throw new Error(`Supabase query failed: ${error.message}`);
      }

      if (contacts && contacts.length > 0) {
        allContacts = [...allContacts, ...contacts as SupabaseContact[]];
        console.log(`[API] Retrieved ${contacts.length} contacts in this batch (total so far: ${allContacts.length})`);
      }

      // Check if there are more records
      if (!contacts || contacts.length < pageSize) {
        hasMore = false;
        console.log(`[API] No more records to fetch. Total count: ${count || allContacts.length}`);
      } else {
        from += pageSize;
      }
    }

    console.log(`[API] Successfully retrieved ALL ${allContacts.length} customer contacts`);

    // Transform Supabase contacts to HubSpotContact format
    const transformedContacts: HubSpotContact[] = allContacts.map((contact) => ({
      id: contact.id,
      hs_object_id: contact.hs_object_id || undefined, // HubSpot ID for URL routing
      createdAt: contact.createdate || new Date().toISOString(),
      updatedAt: contact.lastmodifieddate || contact.synced_at || new Date().toISOString(),
      archived: false,
      properties: {
        email: contact.email || null,
        firstname: contact.firstname || null,
        lastname: contact.lastname || null,
        phone: contact.phone || contact.mobilephone || null,
        company: contact.company || null,
        website: contact.website || contact.current_website || null,
        address: contact.address || null,
        city: contact.city || null,
        state: contact.state || null,
        zip: contact.zip || null,
        country: contact.country || null,
        jobtitle: null, // Not available in our Supabase schema
        lifecyclestage: contact.lifecyclestage || null,
        hs_lead_status: contact.active_customer || null,
        // Additional custom properties
        business_type: contact.business_type || null,
        business_category_type: contact.business_category_type || null,
        business_hours: contact.business_hours || null,
        current_website: contact.current_website || null,
        website_status: contact.website_status || null,
        gbp_ready: contact.gbp_ready || null,
        published_status: contact.published_status || null,
        publishing_fee_paid: contact.publishing_fee_paid || null,
        completeness_score: contact.completeness_score?.toString() || null,
      },
    }));

    return NextResponse.json({
      success: true,
      data: transformedContacts,
      paging: null, // All records fetched using pagination
      timestamp: new Date().toISOString(),
      metadata: {
        totalContacts: transformedContacts.length,
        hasMore: false,
        nextCursor: undefined,
        source: 'Supabase Database - All Customer Contacts',
      },
    });

  } catch (error: any) {
    console.error('[API] Error listing contacts from Supabase:', error);

    // Generic error response
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list contacts from Supabase',
        message: error.message || 'Unknown error occurred',
        details: error,
      },
      { status: 500 }
    );
  }
}
