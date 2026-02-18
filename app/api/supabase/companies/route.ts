/**
 * Supabase Companies List API
 *
 * This endpoint reads CUSTOMER contacts from Supabase database.
 * It NEVER modifies any data - only reads from the contacts table.
 * FILTERS to only include contacts where lifecyclestage="customer"
 *
 * Returns: Array of customer companies from Supabase
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export interface HubSpotCompany {
  id: string;
  name: string | null;
  domain: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  description?: string | null;
  industry?: string | null;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  url: string;
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

export async function GET() {
  console.log('[API /api/supabase/companies] GET request received (Supabase mode)');

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

    console.log('[API] Fetching customer contacts from Supabase...');

    // Fetch all contacts for this user where lifecyclestage = "customer"
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .eq('lifecyclestage', 'customer')
      .order('company', { ascending: true });

    if (error) {
      throw new Error(`Supabase query failed: ${error.message}`);
    }

    console.log(`[API] Fetched ${contacts?.length ?? 0} customer contacts`);

    // Convert Supabase contacts to HubSpotCompany format
    const companies: HubSpotCompany[] = (contacts as SupabaseContact[]).map((contact) => {
      // Use company name, or fallback to firstname + lastname
      const name = contact.company ||
                   (contact.firstname || contact.lastname
                     ? `${contact.firstname || ''} ${contact.lastname || ''}`.trim()
                     : 'Unknown Company');

      return {
        id: contact.id,
        name: name || null,
        domain: contact.current_website || contact.website || null,
        website: contact.website || contact.current_website || null,
        phone: contact.phone || contact.mobilephone || null,
        email: contact.email || null,
        address: contact.address || null,
        address2: undefined,
        city: contact.city || null,
        state: contact.state || null,
        zip: contact.zip || null,
        country: contact.country || null,
        description: contact.business_type || contact.business_category_type || null,
        industry: contact.business_category_type || contact.business_type || null,
        createdAt: contact.createdate || new Date().toISOString(),
        updatedAt: contact.lastmodifieddate || contact.synced_at || new Date().toISOString(),
        archived: false,
        url: `https://app.hubspot.com/contacts/${contact.hs_object_id || contact.id}`,
      };
    });

    console.log('[API] Converted to HubSpotCompany format');
    console.log('[API] Returning customer companies list (Supabase source)');

    return NextResponse.json({
      success: true,
      data: companies,
      timestamp: new Date().toISOString(),
      metadata: {
        totalCompanies: companies.length,
        source: 'Supabase Database - Customers Only',
        filter: 'lifecyclestage=customer',
        readOnly: true,
      }
    });
  } catch (error) {
    console.error('[API] Error fetching from Supabase:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch companies from Supabase',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
