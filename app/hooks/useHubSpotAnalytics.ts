/**
 * useHubSpotAnalytics Hook (v2)
 *
 * Fetches comprehensive analytics data from HubSpot with lifecycle filtering.
 * Provides insights across leads, customers, and opportunities.
 */

import { useState, useEffect, useCallback } from 'react';

// ============ TYPE DEFINITIONS ============

// Removed 'all' - default to 'customer' for focused, actionable insights
export type LifecycleFilter = 'lead' | 'customer' | 'opportunity';

export interface LifecycleBreakdown {
  leads: number;
  customers: number;
  opportunities: number;
  other: number;
}

export interface HubSpotKPIs {
  totalContacts: number;
  lifecycleBreakdown: LifecycleBreakdown;
  avgCompleteness: number;
  recentlyActive: number;
  recentlyActivePercent: number;
  websiteCoverage: number;
  websiteCoveragePercent: number;
  unknownStateCount: number; // Count of contacts with unknown state (filtered from geographic chart)
}

export interface LifecycleDistributionItem {
  name: string;
  value: number;
  color: string;
}

export interface CompletenessByLifecycleItem {
  name: string;
  avgCompleteness: number;
  count: number;
}

export interface ActivityByPeriodItem {
  period: string;
  leads: number;
  customers: number;
  other: number;
}

export interface GeographicDistributionItem {
  name: string;
  value: number;
}

export interface EngagementByNotesItem {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

export interface AcquisitionTimelineItem {
  month: string;
  newLeads: number;
  newCustomers: number;
  cumulativeLeads: number;
  cumulativeCustomers: number;
  total: number;
}

export interface ProfileListItem {
  id: string;
  name: string;
  completeness: number;
  lifecycle: string;
  state?: string;
  missingFields?: string[];
}

export interface HubSpotCharts {
  lifecycleDistribution: LifecycleDistributionItem[];
  completenessByLifecycle: CompletenessByLifecycleItem[];
  activityByPeriod: ActivityByPeriodItem[];
  geographicDistribution: GeographicDistributionItem[];
  engagementByNotes: EngagementByNotesItem[];
  acquisitionTimeline: AcquisitionTimelineItem[];
}

export interface HubSpotLists {
  topByCompleteness: ProfileListItem[];
  needsAttention: ProfileListItem[];
}

export interface HubSpotAnalyticsData {
  kpis: HubSpotKPIs;
  charts: HubSpotCharts;
  lists: HubSpotLists;
}

interface UseHubSpotAnalyticsResult {
  data: HubSpotAnalyticsData | null;
  loading: boolean;
  error: string | null;
  lifecycleFilter: LifecycleFilter;
  setLifecycleFilter: (filter: LifecycleFilter) => void;
  refetch: () => Promise<void>;
}

// ============ HOOK IMPLEMENTATION ============

export function useHubSpotAnalytics(
  initialFilter: LifecycleFilter = 'customer'
): UseHubSpotAnalyticsResult {
  const [data, setData] = useState<HubSpotAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>(initialFilter);

  const fetchAnalytics = useCallback(async (filter: LifecycleFilter) => {
    setLoading(true);
    setError(null);

    try {
      console.log(`[useHubSpotAnalytics] Fetching analytics with filter: ${filter}`);
      // Use cached endpoint (Supabase) for fast queries (~100ms vs 15+ seconds from HubSpot)
      const response = await fetch(`/api/hubspot/analytics-cached?lifecycle=${filter}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch analytics');
      }

      console.log('[useHubSpotAnalytics] Analytics data received:', {
        totalContacts: result.data.kpis.totalContacts,
        filter: result.filter,
      });

      setData(result.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useHubSpotAnalytics] Error:', message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and when filter changes
  useEffect(() => {
    fetchAnalytics(lifecycleFilter);
  }, [fetchAnalytics, lifecycleFilter]);

  // Handler to change filter (triggers refetch via useEffect)
  const handleSetLifecycleFilter = useCallback((filter: LifecycleFilter) => {
    setLifecycleFilter(filter);
  }, []);

  // Manual refetch
  const refetch = useCallback(async () => {
    await fetchAnalytics(lifecycleFilter);
  }, [fetchAnalytics, lifecycleFilter]);

  return {
    data,
    loading,
    error,
    lifecycleFilter,
    setLifecycleFilter: handleSetLifecycleFilter,
    refetch,
  };
}

// ============ UTILITY FUNCTIONS ============

/**
 * Format large numbers with K/M suffixes
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Get color for completeness score
 */
export function getCompletenessColor(score: number): string {
  if (score >= 75) return '#10b981'; // green
  if (score >= 50) return '#f59e0b'; // amber
  if (score >= 25) return '#f97316'; // orange
  return '#ef4444'; // red
}

/**
 * Get lifecycle stage display name
 */
export function getLifecycleName(lifecycle: string): string {
  const names: Record<string, string> = {
    lead: 'Lead',
    customer: 'Customer',
    opportunity: 'Opportunity',
    subscriber: 'Subscriber',
    marketingqualifiedlead: 'MQL',
    salesqualifiedlead: 'SQL',
    evangelist: 'Evangelist',
    other: 'Other',
  };
  return names[lifecycle] || lifecycle;
}
