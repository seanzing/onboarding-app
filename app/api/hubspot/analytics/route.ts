/**
 * HubSpot Analytics API Route (v2)
 *
 * Provides comprehensive analytics across ALL contacts with lifecycle filtering.
 * Designed based on real data validation - only uses populated fields.
 *
 * Features:
 * - Lifecycle stage breakdown (lead, customer, opportunity, other)
 * - Data completeness scoring with lifecycle comparison
 * - Activity/freshness metrics
 * - Engagement by notes
 * - Geographic distribution (with state normalization)
 * - Acquisition timeline
 *
 * GET /api/hubspot/analytics?lifecycle=all|lead|customer|opportunity
 */

import { NextRequest, NextResponse } from 'next/server';
import { getHubSpotClient } from '@/lib/hubspot-client';

// Properties to fetch for analytics (only populated fields based on testing)
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
  'createdate',
  'lastmodifieddate',
  'hs_object_id',
  'num_notes',
  'hs_lead_status',
];

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

// Valid lifecycle stages (filter out corrupted numeric values)
const VALID_LIFECYCLE_STAGES = ['lead', 'customer', 'opportunity', 'subscriber', 'marketingqualifiedlead', 'salesqualifiedlead', 'evangelist', 'other'];

interface ContactData {
  id: string;
  properties: Record<string, string | null>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Normalize state values (CA → California)
 */
function normalizeState(state: string | null): string {
  if (!state) return 'Unknown';
  const trimmed = state.trim().toUpperCase();
  // Check if it's an abbreviation
  if (STATE_NORMALIZATION[trimmed]) {
    return STATE_NORMALIZATION[trimmed];
  }
  // Check if it's already a full name (title case it)
  const titleCase = state.trim().split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  return titleCase || 'Unknown';
}

/**
 * Normalize lifecycle stage (filter out corrupted values)
 */
function normalizeLifecycleStage(stage: string | null): string {
  if (!stage) return 'other';
  const normalized = stage.toLowerCase().trim();
  // Check if it's a valid stage or a numeric (corrupted) value
  if (VALID_LIFECYCLE_STAGES.includes(normalized)) {
    return normalized;
  }
  // If it's numeric or unknown, categorize as 'other'
  return 'other';
}

/**
 * Calculate completeness score for a contact (0-100)
 */
function calculateCompleteness(properties: Record<string, string | null>): number {
  const filledFields = COMPLETENESS_FIELDS.filter((field) => {
    const value = properties[field];
    if (!value || value.trim() === '') return false;
    // Filter out invalid website values
    if (field === 'website') {
      const lower = value.toLowerCase().trim();
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
 * Check if website is valid
 */
function hasValidWebsite(website: string | null): boolean {
  if (!website) return false;
  const lower = website.toLowerCase().trim();
  if (lower === 'no' || lower === 'http://no' || lower === 'n/a' || lower === 'none' || lower === '') {
    return false;
  }
  return true;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lifecycleFilter = searchParams.get('lifecycle') || 'all';

  console.log(`[API /api/hubspot/analytics] GET request - lifecycle filter: ${lifecycleFilter}`);

  try {
    const client = getHubSpotClient();
    const allContacts: ContactData[] = [];
    let cursor: string | undefined;
    let pageCount = 0;
    const maxPages = 100; // Up to 10,000 contacts

    // Fetch ALL contacts (no lifecycle filter at API level)
    do {
      pageCount++;
      if (pageCount % 10 === 0) {
        console.log(`[Analytics] Fetching page ${pageCount}...`);
      }

      const response = await client.crm.contacts.basicApi.getPage(
        100,
        cursor,
        CONTACT_PROPERTIES,
        undefined,
        undefined,
        false
      );

      for (const contact of response.results) {
        allContacts.push({
          id: contact.id,
          properties: contact.properties,
          createdAt: contact.createdAt,
          updatedAt: contact.updatedAt,
        });
      }

      cursor = response.paging?.next?.after;
    } while (cursor && pageCount < maxPages);

    console.log(`[Analytics] Total contacts fetched: ${allContacts.length}`);

    // Normalize lifecycle stages
    const contactsWithNormalizedLifecycle = allContacts.map(c => ({
      ...c,
      normalizedLifecycle: normalizeLifecycleStage(c.properties.lifecyclestage),
    }));

    // Apply lifecycle filter if not 'all'
    let filteredContacts = contactsWithNormalizedLifecycle;
    if (lifecycleFilter !== 'all') {
      filteredContacts = contactsWithNormalizedLifecycle.filter(
        c => c.normalizedLifecycle === lifecycleFilter
      );
    }

    const totalContacts = filteredContacts.length;
    const now = new Date();

    // ============ KPI CALCULATIONS ============

    // Lifecycle breakdown (always from full dataset)
    const leads = contactsWithNormalizedLifecycle.filter(c => c.normalizedLifecycle === 'lead').length;
    const customers = contactsWithNormalizedLifecycle.filter(c => c.normalizedLifecycle === 'customer').length;
    const opportunities = contactsWithNormalizedLifecycle.filter(c => c.normalizedLifecycle === 'opportunity').length;
    const other = contactsWithNormalizedLifecycle.filter(c =>
      !['lead', 'customer', 'opportunity'].includes(c.normalizedLifecycle)
    ).length;

    // Average completeness (from filtered set)
    const totalCompleteness = filteredContacts.reduce(
      (sum, c) => sum + calculateCompleteness(c.properties), 0
    );
    const avgCompleteness = totalContacts > 0 ? Math.round(totalCompleteness / totalContacts) : 0;

    // Recently active (last 30 days)
    const recentlyActive = filteredContacts.filter(
      c => isWithinDays(c.updatedAt, 30)
    ).length;
    const recentlyActivePercent = totalContacts > 0
      ? Math.round((recentlyActive / totalContacts) * 100)
      : 0;

    // Website coverage
    const withWebsite = filteredContacts.filter(
      c => hasValidWebsite(c.properties.website)
    ).length;
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
    const completenessByLifecycle = [
      {
        name: 'Leads',
        avgCompleteness: Math.round(
          contactsWithNormalizedLifecycle
            .filter(c => c.normalizedLifecycle === 'lead')
            .reduce((sum, c) => sum + calculateCompleteness(c.properties), 0) /
          Math.max(leads, 1)
        ),
        count: leads,
      },
      {
        name: 'Customers',
        avgCompleteness: Math.round(
          contactsWithNormalizedLifecycle
            .filter(c => c.normalizedLifecycle === 'customer')
            .reduce((sum, c) => sum + calculateCompleteness(c.properties), 0) /
          Math.max(customers, 1)
        ),
        count: customers,
      },
      {
        name: 'Opportunities',
        avgCompleteness: Math.round(
          contactsWithNormalizedLifecycle
            .filter(c => c.normalizedLifecycle === 'opportunity')
            .reduce((sum, c) => sum + calculateCompleteness(c.properties), 0) /
          Math.max(opportunities, 1)
        ),
        count: opportunities,
      },
    ].filter(item => item.count > 0);

    // ============ CHART 3: Activity by Lifecycle (last 7/30/90 days) ============
    const activityByPeriod = [
      {
        period: 'Last 7 Days',
        leads: contactsWithNormalizedLifecycle.filter(c => c.normalizedLifecycle === 'lead' && isWithinDays(c.updatedAt, 7)).length,
        customers: contactsWithNormalizedLifecycle.filter(c => c.normalizedLifecycle === 'customer' && isWithinDays(c.updatedAt, 7)).length,
        other: contactsWithNormalizedLifecycle.filter(c => !['lead', 'customer'].includes(c.normalizedLifecycle) && isWithinDays(c.updatedAt, 7)).length,
      },
      {
        period: 'Last 30 Days',
        leads: contactsWithNormalizedLifecycle.filter(c => c.normalizedLifecycle === 'lead' && isWithinDays(c.updatedAt, 30)).length,
        customers: contactsWithNormalizedLifecycle.filter(c => c.normalizedLifecycle === 'customer' && isWithinDays(c.updatedAt, 30)).length,
        other: contactsWithNormalizedLifecycle.filter(c => !['lead', 'customer'].includes(c.normalizedLifecycle) && isWithinDays(c.updatedAt, 30)).length,
      },
      {
        period: 'Last 90 Days',
        leads: contactsWithNormalizedLifecycle.filter(c => c.normalizedLifecycle === 'lead' && isWithinDays(c.updatedAt, 90)).length,
        customers: contactsWithNormalizedLifecycle.filter(c => c.normalizedLifecycle === 'customer' && isWithinDays(c.updatedAt, 90)).length,
        other: contactsWithNormalizedLifecycle.filter(c => !['lead', 'customer'].includes(c.normalizedLifecycle) && isWithinDays(c.updatedAt, 90)).length,
      },
    ];

    // ============ CHART 4: Geographic Distribution (normalized states) ============
    const stateCounts: Record<string, number> = {};
    for (const contact of filteredContacts) {
      const state = normalizeState(contact.properties.state);
      stateCounts[state] = (stateCounts[state] || 0) + 1;
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
        const numNotes = parseInt(c.properties.num_notes || '0', 10);
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
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(getMonthYear(date));
    }

    const monthlyCounts: Record<string, { leads: number; customers: number; other: number }> = {};
    months.forEach(m => (monthlyCounts[m] = { leads: 0, customers: 0, other: 0 }));

    for (const contact of contactsWithNormalizedLifecycle) {
      const monthYear = getMonthYear(contact.createdAt);
      if (monthlyCounts[monthYear]) {
        if (contact.normalizedLifecycle === 'lead') {
          monthlyCounts[monthYear].leads++;
        } else if (contact.normalizedLifecycle === 'customer') {
          monthlyCounts[monthYear].customers++;
        } else {
          monthlyCounts[monthYear].other++;
        }
      }
    }

    // Calculate cumulative totals
    let cumulativeLeads = contactsWithNormalizedLifecycle.filter(c => {
      const monthYear = getMonthYear(c.createdAt);
      return !months.includes(monthYear) && c.normalizedLifecycle === 'lead';
    }).length;
    let cumulativeCustomers = contactsWithNormalizedLifecycle.filter(c => {
      const monthYear = getMonthYear(c.createdAt);
      return !months.includes(monthYear) && c.normalizedLifecycle === 'customer';
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

    // Top 5 by completeness (from filtered set)
    const topByCompleteness = filteredContacts
      .map(c => ({
        id: c.id,
        name: c.properties.company ||
          `${c.properties.firstname || ''} ${c.properties.lastname || ''}`.trim() ||
          c.properties.email ||
          'Unknown',
        completeness: calculateCompleteness(c.properties),
        lifecycle: c.normalizedLifecycle,
        state: normalizeState(c.properties.state),
      }))
      .sort((a, b) => b.completeness - a.completeness)
      .slice(0, 5);

    // Needs attention (lowest completeness)
    const needsAttention = filteredContacts
      .map(c => ({
        id: c.id,
        name: c.properties.company ||
          `${c.properties.firstname || ''} ${c.properties.lastname || ''}`.trim() ||
          c.properties.email ||
          'Unknown',
        completeness: calculateCompleteness(c.properties),
        lifecycle: c.normalizedLifecycle,
        missingFields: COMPLETENESS_FIELDS.filter(f => {
          const value = c.properties[f];
          if (!value || value.trim() === '') return true;
          if (f === 'website') {
            const lower = value.toLowerCase().trim();
            return lower === 'no' || lower === 'http://no' || lower === 'n/a' || lower === 'none';
          }
          return false;
        }),
      }))
      .sort((a, b) => a.completeness - b.completeness)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      filter: lifecycleFilter,
      data: {
        kpis: {
          totalContacts,
          lifecycleBreakdown: { leads, customers, opportunities, other },
          avgCompleteness,
          recentlyActive,
          recentlyActivePercent,
          websiteCoverage: withWebsite,
          websiteCoveragePercent,
        },
        charts: {
          lifecycleDistribution,
          completenessByLifecycle,
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
    console.error('[Analytics] Error generating analytics:', error);

    const err = error as { message?: string; body?: unknown };
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate analytics',
        message: err.message || 'Unknown error occurred',
        details: err.body || String(error),
      },
      { status: 500 }
    );
  }
}
