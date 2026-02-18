/**
 * Supabase Business Profile API
 *
 * This endpoint ONLY fetches the first customer contact from Supabase.
 * It NEVER modifies any data - only reads from the contacts table.
 *
 * Returns: BusinessProfile format for the first customer
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { BusinessProfileApiResponse, BusinessProfile } from '@/app/types/business-profile';

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
  console.log('[API /api/supabase/business-profile] GET request received');

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

    console.log('[API] Fetching first customer contact from Supabase...');

    // Fetch first contact for this user where lifecyclestage = "customer"
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .eq('lifecyclestage', 'customer')
      .order('company', { ascending: true })
      .limit(1);

    if (error) {
      throw new Error(`Supabase query failed: ${error.message}`);
    }

    if (!contacts || contacts.length === 0) {
      throw new Error('No customer contacts found in Supabase');
    }

    const firstContact = contacts[0] as SupabaseContact;
    console.log(`[API] Found customer: ${firstContact.company || firstContact.email}`);

    // Build BusinessProfile from Supabase contact data
    const profile: BusinessProfile = {
      id: firstContact.id,
      name: firstContact.company ||
            `${firstContact.firstname || ''} ${firstContact.lastname || ''}`.trim() ||
            'Unknown Company',
      address: {
        street: firstContact.address || '',
        city: firstContact.city || '',
        state: firstContact.state || '',
        zipCode: firstContact.zip || '',
        country: firstContact.country || '',
      },
      phone: firstContact.phone || firstContact.mobilephone || '',
      email: firstContact.email || '',
      website: firstContact.website || firstContact.current_website || '',
      description: firstContact.business_type || firstContact.business_category_type || '',
      categories: firstContact.business_category_type ? [firstContact.business_category_type] : [],
      hours: undefined, // Business hours not consistently available
      photos: [],
      logo: undefined,
      socialMedia: {},
    };

    // Count total customers
    const { count: totalCount } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('lifecyclestage', 'customer');

    const response: BusinessProfileApiResponse = {
      success: true,
      data: profile,
      timestamp: new Date().toISOString(),
      metadata: {
        totalCompanies: totalCount ?? 1,
        totalContacts: totalCount ?? 1,
        aiSteps: 0,  // No AI steps - direct database query
      }
    };

    console.log('[API] Returning business profile:', {
      id: response.data.id,
      name: response.data.name,
      address: response.data.address,
      metadata: response.metadata,
      timestamp: response.timestamp,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Error with Supabase:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch business profile from Supabase',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
