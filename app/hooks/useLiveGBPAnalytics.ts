'use client';

/**
 * useGBPAnalytics Hook
 *
 * Fetches search keyword impressions and performance metrics from GBP.
 * Uses the Business Profile Performance API to get top search keywords.
 */

import { useState, useEffect, useCallback } from 'react';

export interface GBPKeyword {
  keyword: string;
  impressions: number;
  threshold?: string;
}

export interface GBPAnalytics {
  keywords: GBPKeyword[];
  totalKeywords: number;
  totalImpressions: number;
  dateRange: {
    start: { year: number; month: number };
    end: { year: number; month: number };
  };
}

interface UseGBPAnalyticsReturn {
  analytics: GBPAnalytics | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * LIVE hook - fetches directly from Google API.
 * For cached/synced data, use useSupabaseGBPAnalytics from useSupabaseGBP.ts
 */
export function useLiveGBPAnalytics(locationId?: string): UseGBPAnalyticsReturn {
  const [analytics, setAnalytics] = useState<GBPAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (locationId) params.set('locationId', locationId);

      const response = await fetch(`/api/gbp/analytics?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch analytics');
      }

      const data = await response.json();

      if (data.success) {
        setAnalytics(data.analytics);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      console.error('[useGBPAnalytics] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    loading,
    error,
    refetch: fetchAnalytics,
  };
}
