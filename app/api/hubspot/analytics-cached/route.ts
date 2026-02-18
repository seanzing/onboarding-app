/**
 * HubSpot Analytics API Route (Cached/Supabase Version)
 *
 * Provides comprehensive analytics by querying Supabase instead of HubSpot.
 * This is MUCH faster (~100ms vs 15+ seconds) because it queries local PostgreSQL.
 *
 * Prerequisites:
 * - Run /api/sync/all-contacts to populate Supabase with all HubSpot contacts
 * - Data freshness depends on last sync time
 *
 * Features:
 * - Lifecycle stage breakdown (lead, customer, opportunity, other)
 * - Data completeness scoring with lifecycle comparison
 * - Activity/freshness metrics
 * - Engagement by notes
 * - Geographic distribution (with state normalization)
 * - Acquisition timeline
 *
 * GET /api/hubspot/analytics-cached?lifecycle=all|lead|customer|opportunity
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Fields used for completeness calculation
const COMPLETENESS_FIELDS = [
  'email',
  'firstname',
  'lastname',
  'phone',
  'company',
  'website',
  'address',
  'city',
  'state',
  'zip',
];

// State abbreviation to full name mapping
const STATE_NORMALIZATION: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
  'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
  'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
  'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
  'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
  'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
  'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
  'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
  'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
  'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
  'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia',
};

// Valid lifecycle stages (title case - matches sync service translation)
// The sync service stores 'Lead', 'Customer', 'HOT', 'DNC', etc.
const VALID_LIFECYCLE_STAGES = ['Lead', 'Customer', 'Opportunity', 'Subscriber', 'Marketing Qualified Lead', 'Sales Qualified Lead', 'Evangelist', 'Other', 'HOT', 'DNC', 'Active', 'No Show', 'Reengage', 'VC'];

// Map UI filter values (lowercase) to database values (title case)
// The sync service stores translated labels like 'Lead', 'Customer', not 'lead', 'customer'
const FILTER_TO_DB_VALUE: Record<string, string> = {
  'lead': 'Lead',
  'customer': 'Customer',
  'opportunity': 'Opportunity',
};

interface SupabaseContact {
  id: string;
  hubspot_contact_id: string;
  user_id: string;
  email: string | null;
  firstname: string | null;  // HubSpot-style naming (no underscore)
  lastname: string | null;   // HubSpot-style naming (no underscore)
  phone: string | null;
  mobilephone: string | null;
  company: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  lifecyclestage: string | null;  // HubSpot-style naming (no underscore)
  hs_lead_status: string | null;
  num_notes: string | null;
  createdate: string | null;
  lastmodifieddate: string | null;
  synced_at: string | null;  // NOT last_synced_at
}

/**
 * Normalize state values (CA → California)
 */
function normalizeState(state: string | null): string {
  if (!state) return 'Unknown';
  const trimmed = state.trim().toUpperCase();
  if (STATE_NORMALIZATION[trimmed]) {
    return STATE_NORMALIZATION[trimmed];
  }
  const titleCase = state.trim().split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  return titleCase || 'Unknown';
}

/**
 * Normalize lifecycle stage (validate against known stages)
 * Preserves the original case since DB stores title case
 */
function normalizeLifecycleStage(stage: string | null): string {
  if (!stage) return 'Other';
  const trimmed = stage.trim();
  // Check if it's a valid stage (case-sensitive, DB stores title case)
  if (VALID_LIFECYCLE_STAGES.includes(trimmed)) {
    return trimmed;
  }
  // If not found, return as-is but default to 'Other' for unknown
  return 'Other';
}

/**
 * Calculate completeness score for a contact (0-100)
 * Uses direct field access (HubSpot-style naming: firstname, lastname, etc.)
 */
function calculateCompleteness(contact: SupabaseContact): number {
  const filledFields = COMPLETENESS_FIELDS.filter((field) => {
    // Direct field access using correct column names
    const value = (contact as unknown as Record<string, string | null>)[field];
    if (!value || String(value).trim() === '') return false;

    // Filter out invalid website values
    if (field === 'website') {
      const lower = String(value).toLowerCase().trim();
      if (lower === 'no' || lower === 'http://no' || lower === 'n/a' || lower === 'none') {
        return false;
      }
    }
    return true;
  }).length;

  return Math.round((filledFields / COMPLETENESS_FIELDS.length) * 100);
}

/**
 * Get month-year string from date
 */
function getMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

/**
 * Check if date is within days ago
 */
function isWithinDays(date: Date, days: number): boolean {
  const now = Date.now();
  const targetTime = date.getTime();
  const daysInMs = days * 24 * 60 * 60 * 1000;
  return (now - targetTime) <= daysInMs;
}

/**
 * Check if contact was active within specified days (handles null dates)
 */
function isContactActiveWithinDays(contact: { lastmodifieddate: string | null; synced_at: string | null }, days: number): boolean {
  const dateStr = contact.lastmodifieddate || contact.synced_at;
  if (!dateStr) return false;
  return isWithinDays(new Date(dateStr), days);
}

/**
 * Check if website is valid
 */
function hasValidWebsite(contact: SupabaseContact): boolean {
  const website = contact.website;
  if (!website) return false;
  const lower = String(website).toLowerCase().trim();
  if (lower === 'no' || lower === 'http://no' || lower === 'n/a' || lower === 'none' || lower === '') {
    return false;
  }
  return true;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const searchParams = request.nextUrl.searchParams;
  const lifecycleFilter = searchParams.get('lifecycle') || 'all';

  console.log(`[API /api/hubspot/analytics-cached] GET request - lifecycle filter: ${lifecycleFilter}`);

  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate with Supabase to satisfy RLS policies
    // RLS requires auth.uid() = user_id, anonymous clients return NULL
    const testEmail = process.env.TEST_EMAIL;
    const testPassword = process.env.TEST_PASSWORD;

    if (!testEmail || !testPassword) {
      console.error('[Analytics Cached] Missing TEST_EMAIL or TEST_PASSWORD environment variables');
      return NextResponse.json({
        success: false,
        message: 'Server configuration error: Missing authentication credentials',
      }, { status: 500 });
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (authError) {
      console.error('[Analytics Cached] Auth failed:', authError.message);
      return NextResponse.json({
        success: false,
        message: `Authentication failed: ${authError.message}`,
      }, { status: 401 });
    }

    const userId = authData.user.id;
    console.log(`[Analytics Cached] Authenticated as: ${authData.user.email}`);

    // === OPTIMIZATION: Apply lifecycle filter at DATABASE level ===
    // This reduces data transfer significantly (e.g., 133K → ~1K for customers)

    // 1. First, get lifecycle distribution counts (always need full picture)
    console.log('[Analytics Cached] Getting lifecycle distribution counts...');
    const { data: lifecycleCounts, error: countError } = await supabase
      .rpc('get_lifecycle_counts');

    // Fallback if RPC doesn't exist - use a simple query
    let leads = 0, customers = 0, opportunities = 0, other = 0;

    if (countError || !lifecycleCounts) {
      console.log('[Analytics Cached] RPC not available, using fallback count queries...');
      // Fallback: Use individual count queries (still faster than fetching all data)
      // Use title case values to match what's stored in DB (from sync translation)
      // Include user_id filter to satisfy RLS policy
      const [leadsResult, customersResult, opportunitiesResult, totalResult] = await Promise.all([
        supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('lifecyclestage', 'Lead'),
        supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('lifecyclestage', 'Customer'),
        supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('lifecyclestage', 'Opportunity'),
        supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      ]);

      leads = leadsResult.count || 0;
      customers = customersResult.count || 0;
      opportunities = opportunitiesResult.count || 0;
      const total = totalResult.count || 0;
      other = total - leads - customers - opportunities;
      console.log(`[Analytics Cached] Lifecycle counts: leads=${leads}, customers=${customers}, opportunities=${opportunities}, other=${other}`);
    } else {
      // Use RPC results
      for (const row of lifecycleCounts) {
        if (row.lifecyclestage === 'lead') leads = row.count;
        else if (row.lifecyclestage === 'customer') customers = row.count;
        else if (row.lifecyclestage === 'opportunity') opportunities = row.count;
        else other += row.count;
      }
    }

    // 2. Fetch contacts with database-level filter applied (using pagination)
    // Limit to 50K records max to prevent extremely slow queries (108K leads takes 60+ seconds)
    const MAX_CONTACTS = 50000;
    console.log('[Analytics Cached] Fetching contacts from Supabase with filter...');

    // Paginate to get contacts (Supabase default limit is 1000)
    let allContacts: SupabaseContact[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;
    let hitLimit = false;

    while (hasMore && allContacts.length < MAX_CONTACTS) {
      // Build query with user_id filter to satisfy RLS policy
      let query = supabase
        .from('contacts')
        .select('*')
        .eq('user_id', userId);

      // Apply lifecycle filter at DATABASE level (not in-memory)
      // Convert lowercase UI values to title case DB values
      if (lifecycleFilter !== 'all') {
        const dbValue = FILTER_TO_DB_VALUE[lifecycleFilter] || lifecycleFilter;
        if (from === 0) {
          console.log(`[Analytics Cached] Applying database filter: lifecyclestage = '${dbValue}' (UI: '${lifecycleFilter}')`);
        }
        query = query.eq('lifecyclestage', dbValue);
      }

      // Add pagination
      query = query.range(from, from + pageSize - 1);

      const { data: contacts, error } = await query;

      if (error) {
        throw new Error(`Supabase query failed: ${error.message}`);
      }

      if (contacts && contacts.length > 0) {
        allContacts = [...allContacts, ...contacts as SupabaseContact[]];
      }

      // Check if there are more records
      if (!contacts || contacts.length < pageSize) {
        hasMore = false;
      } else {
        from += pageSize;
      }

      // Check if we've hit the limit
      if (allContacts.length >= MAX_CONTACTS) {
        hitLimit = true;
        console.log(`[Analytics Cached] Hit MAX_CONTACTS limit (${MAX_CONTACTS}), stopping pagination`);
      }
    }

    const contacts = allContacts;
    console.log(`[Analytics Cached] Fetched ${contacts.length} contacts${hitLimit ? ` (limited to ${MAX_CONTACTS})` : ' (all data)'}`);

    if (!contacts || contacts.length === 0) {
      console.log('[Analytics Cached] No contacts found in Supabase. Run /api/sync/all-contacts first.');
      return NextResponse.json({
        success: false,
        message: 'No contacts found in Supabase. Please run the sync first: POST /api/sync/all-contacts',
        data: null,
      }, { status: 404 });
    }

    console.log(`[Analytics Cached] Fetched ${contacts.length} contacts from Supabase in ${Date.now() - startTime}ms`);

    // Normalize lifecycle stages for the fetched contacts
    const contactsWithNormalizedLifecycle = contacts.map((c: SupabaseContact) => ({
      ...c,
      normalizedLifecycle: normalizeLifecycleStage(c.lifecyclestage),
    }));

    // filteredContacts is now the database-filtered result (no in-memory filtering needed)
    const filteredContacts = contactsWithNormalizedLifecycle;

    const totalContacts = filteredContacts.length;
    const now = new Date();

    // ============ KPI CALCULATIONS ============
    // NOTE: Lifecycle counts (leads, customers, opportunities, other) are already computed
    // from database queries above - no need to recalculate from filtered data

    // Average completeness (from filtered set)
    const totalCompleteness = filteredContacts.reduce(
      (sum, c) => sum + calculateCompleteness(c), 0
    );
    const avgCompleteness = totalContacts > 0 ? Math.round(totalCompleteness / totalContacts) : 0;

    // Recently active (last 30 days based on updated_at)
    const recentlyActive = filteredContacts.filter(c => {
      const dateStr = c.lastmodifieddate || c.synced_at;
      if (!dateStr) return false;
      const updatedAt = new Date(dateStr);
      return isWithinDays(updatedAt, 30);
    }).length;
    const recentlyActivePercent = totalContacts > 0
      ? Math.round((recentlyActive / totalContacts) * 100)
      : 0;

    // Website coverage
    const withWebsite = filteredContacts.filter(c => hasValidWebsite(c)).length;
    const websiteCoveragePercent = totalContacts > 0
      ? Math.round((withWebsite / totalContacts) * 100)
      : 0;

    // ============ CHART 1: Lifecycle Distribution ============
    const lifecycleDistribution = [
      { name: 'Leads', value: leads, color: '#3b82f6' },
      { name: 'Customers', value: customers, color: '#10b981' },
      { name: 'Opportunities', value: opportunities, color: '#f59e0b' },
      { name: 'Other', value: other, color: '#6b7280' },
    ].filter(item => item.value > 0);

    // ============ CHART 2: Completeness by Lifecycle ============
    // When filtered, calculate completeness only for the filtered contacts
    // Group by normalized lifecycle within the filtered set
    const lifecycleCompletenessMap: Record<string, { total: number; count: number }> = {};
    for (const c of filteredContacts) {
      const lifecycle = c.normalizedLifecycle;
      if (!lifecycleCompletenessMap[lifecycle]) {
        lifecycleCompletenessMap[lifecycle] = { total: 0, count: 0 };
      }
      lifecycleCompletenessMap[lifecycle].total += calculateCompleteness(c);
      lifecycleCompletenessMap[lifecycle].count++;
    }

    const completenessByLifecycle = Object.entries(lifecycleCompletenessMap)
      .map(([lifecycle, data]) => ({
        name: lifecycle.charAt(0).toUpperCase() + lifecycle.slice(1) + 's',
        avgCompleteness: Math.round(data.total / Math.max(data.count, 1)),
        count: data.count,
      }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count);

    // ============ CHART 3: Activity by Period ============
    // Uses filteredContacts to show activity for the selected lifecycle filter
    // Note: normalizedLifecycle preserves original case from DB ('Lead', 'Customer', etc.)
    const activityByPeriod = [
      {
        period: 'Last 7 Days',
        leads: filteredContacts.filter(c =>
          c.normalizedLifecycle === 'Lead' && isContactActiveWithinDays(c, 7)
        ).length,
        customers: filteredContacts.filter(c =>
          c.normalizedLifecycle === 'Customer' && isContactActiveWithinDays(c, 7)
        ).length,
        other: filteredContacts.filter(c =>
          !['Lead', 'Customer'].includes(c.normalizedLifecycle) && isContactActiveWithinDays(c, 7)
        ).length,
      },
      {
        period: 'Last 30 Days',
        leads: filteredContacts.filter(c =>
          c.normalizedLifecycle === 'Lead' && isContactActiveWithinDays(c, 30)
        ).length,
        customers: filteredContacts.filter(c =>
          c.normalizedLifecycle === 'Customer' && isContactActiveWithinDays(c, 30)
        ).length,
        other: filteredContacts.filter(c =>
          !['Lead', 'Customer'].includes(c.normalizedLifecycle) && isContactActiveWithinDays(c, 30)
        ).length,
      },
      {
        period: 'Last 90 Days',
        leads: filteredContacts.filter(c =>
          c.normalizedLifecycle === 'Lead' && isContactActiveWithinDays(c, 90)
        ).length,
        customers: filteredContacts.filter(c =>
          c.normalizedLifecycle === 'Customer' && isContactActiveWithinDays(c, 90)
        ).length,
        other: filteredContacts.filter(c =>
          !['Lead', 'Customer'].includes(c.normalizedLifecycle) && isContactActiveWithinDays(c, 90)
        ).length,
      },
    ];

    // ============ CHART 4: Geographic Distribution ============
    // Filter OUT "Unknown" states and track the count for subtitle
    const stateCounts: Record<string, number> = {};
    let unknownStateCount = 0;
    for (const contact of filteredContacts) {
      const state = normalizeState(contact.state);
      if (state === 'Unknown') {
        unknownStateCount++;
      } else {
        stateCounts[state] = (stateCounts[state] || 0) + 1;
      }
    }
    const geographicDistribution = Object.entries(stateCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // ============ CHART 5: Engagement by Notes ============
    const noteRanges = [
      { label: 'No Notes', min: 0, max: 0, color: '#ef4444' },
      { label: '1-5 Notes', min: 1, max: 5, color: '#f59e0b' },
      { label: '6-20 Notes', min: 6, max: 20, color: '#3b82f6' },
      { label: '20+ Notes', min: 21, max: Infinity, color: '#10b981' },
    ];
    const engagementByNotes = noteRanges.map(range => {
      const count = filteredContacts.filter(c => {
        const numNotes = parseInt(c.num_notes || '0', 10);
        return numNotes >= range.min && numNotes <= range.max;
      }).length;
      return {
        name: range.label,
        value: count,
        color: range.color,
        percentage: totalContacts > 0 ? Math.round((count / totalContacts) * 100) : 0,
      };
    });

    // ============ CHART 6: Acquisition Timeline ============
    // Uses filteredContacts to show acquisition for the selected lifecycle filter
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(getMonthYear(date));
    }

    const monthlyCounts: Record<string, { leads: number; customers: number; other: number }> = {};
    months.forEach(m => (monthlyCounts[m] = { leads: 0, customers: 0, other: 0 }));

    for (const contact of filteredContacts) {
      // Use createdate column (or synced_at as fallback)
      const createDate = contact.createdate
        ? new Date(contact.createdate)
        : new Date(contact.synced_at || new Date());
      const monthYear = getMonthYear(createDate);

      if (monthlyCounts[monthYear]) {
        // Note: normalizedLifecycle preserves original case from DB ('Lead', 'Customer', etc.)
        if (contact.normalizedLifecycle === 'Lead') {
          monthlyCounts[monthYear].leads++;
        } else if (contact.normalizedLifecycle === 'Customer') {
          monthlyCounts[monthYear].customers++;
        } else {
          monthlyCounts[monthYear].other++;
        }
      }
    }

    // Calculate cumulative totals from filtered contacts (contacts created BEFORE the 12-month window)
    // Note: normalizedLifecycle preserves original case from DB ('Lead', 'Customer', etc.)
    let cumulativeLeads = filteredContacts.filter(c => {
      const createDate = c.createdate
        ? new Date(c.createdate)
        : new Date(c.synced_at || new Date());
      const monthYear = getMonthYear(createDate);
      return !months.includes(monthYear) && c.normalizedLifecycle === 'Lead';
    }).length;
    let cumulativeCustomers = filteredContacts.filter(c => {
      const createDate = c.createdate
        ? new Date(c.createdate)
        : new Date(c.synced_at || new Date());
      const monthYear = getMonthYear(createDate);
      return !months.includes(monthYear) && c.normalizedLifecycle === 'Customer';
    }).length;

    const acquisitionTimeline = months.map(month => {
      cumulativeLeads += monthlyCounts[month].leads;
      cumulativeCustomers += monthlyCounts[month].customers;
      return {
        month,
        newLeads: monthlyCounts[month].leads,
        newCustomers: monthlyCounts[month].customers,
        cumulativeLeads,
        cumulativeCustomers,
        total: monthlyCounts[month].leads + monthlyCounts[month].customers + monthlyCounts[month].other,
      };
    });

    // ============ LISTS ============

    // Top 5 by completeness
    const topByCompleteness = filteredContacts
      .map(c => ({
        id: c.id,
        name: c.company ||
          `${c.firstname || ''} ${c.lastname || ''}`.trim() ||
          c.email ||
          'Unknown',
        completeness: calculateCompleteness(c),
        lifecycle: c.normalizedLifecycle,
        state: normalizeState(c.state),
      }))
      .sort((a, b) => b.completeness - a.completeness)
      .slice(0, 5);

    // Needs attention (lowest completeness)
    const needsAttention = filteredContacts
      .map(c => ({
        id: c.id,
        name: c.company ||
          `${c.firstname || ''} ${c.lastname || ''}`.trim() ||
          c.email ||
          'Unknown',
        completeness: calculateCompleteness(c),
        lifecycle: c.normalizedLifecycle,
        missingFields: COMPLETENESS_FIELDS.filter(f => {
          // Direct field access using correct column names
          const value = (c as Record<string, string | null>)[f];
          if (!value || String(value).trim() === '') return true;
          if (f === 'website') {
            const lower = String(value).toLowerCase().trim();
            return lower === 'no' || lower === 'http://no' || lower === 'n/a' || lower === 'none';
          }
          return false;
        }),
      }))
      .sort((a, b) => a.completeness - b.completeness)
      .slice(0, 5);

    // ============ CHART: Completeness Distribution ============
    // Shows how many contacts fall into each data quality bucket
    const completenessDistribution = [
      { name: 'Excellent (75-100%)', range: '75-100', value: 0, color: '#10b981' },
      { name: 'Good (50-74%)', range: '50-74', value: 0, color: '#22c55e' },
      { name: 'Fair (25-49%)', range: '25-49', value: 0, color: '#f59e0b' },
      { name: 'Needs Work (0-24%)', range: '0-24', value: 0, color: '#ef4444' },
    ];

    for (const contact of filteredContacts) {
      const score = calculateCompleteness(contact);
      if (score >= 75) {
        completenessDistribution[0].value++;
      } else if (score >= 50) {
        completenessDistribution[1].value++;
      } else if (score >= 25) {
        completenessDistribution[2].value++;
      } else {
        completenessDistribution[3].value++;
      }
    }

    // ============ FIELD COVERAGE ============
    // Shows which specific fields are filled across all contacts
    const fieldCoverage = COMPLETENESS_FIELDS.map(field => {
      const filled = filteredContacts.filter(c => {
        const value = (c as unknown as Record<string, string | null>)[field];
        if (!value || String(value).trim() === '') return false;
        if (field === 'website') {
          const lower = String(value).toLowerCase().trim();
          if (lower === 'no' || lower === 'http://no' || lower === 'n/a' || lower === 'none') {
            return false;
          }
        }
        return true;
      }).length;

      const percent = totalContacts > 0 ? Math.round((filled / totalContacts) * 100) : 0;

      // Human-friendly field names
      const displayNames: Record<string, string> = {
        email: 'Email',
        firstname: 'First Name',
        lastname: 'Last Name',
        phone: 'Phone',
        company: 'Company',
        website: 'Website',
        address: 'Address',
        city: 'City',
        state: 'State',
        zip: 'Zip Code',
      };

      return {
        field,
        name: displayNames[field] || field,
        filled,
        missing: totalContacts - filled,
        percent,
      };
    }).sort((a, b) => b.percent - a.percent); // Sort by coverage (highest first)

    const queryTime = Date.now() - startTime;
    console.log(`[Analytics Cached] Analytics computed in ${queryTime}ms`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      filter: lifecycleFilter,
      queryTimeMs: queryTime,
      source: 'supabase', // Indicate this came from cache, not HubSpot
      hitLimit, // True if we reached MAX_CONTACTS limit (50K)
      data: {
        kpis: {
          totalContacts,
          lifecycleBreakdown: { leads, customers, opportunities, other },
          avgCompleteness,
          recentlyActive,
          recentlyActivePercent,
          websiteCoverage: withWebsite,
          websiteCoveragePercent,
          unknownStateCount, // Count of contacts with unknown state (filtered from geographic chart)
        },
        charts: {
          lifecycleDistribution,
          completenessByLifecycle,
          completenessDistribution,
          fieldCoverage,
          activityByPeriod,
          geographicDistribution,
          engagementByNotes,
          acquisitionTimeline,
        },
        lists: {
          topByCompleteness,
          needsAttention,
        },
      },
    });
  } catch (error: unknown) {
    console.error('[Analytics Cached] Error:', error);

    const err = error as { message?: string };
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate analytics',
        message: err.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
