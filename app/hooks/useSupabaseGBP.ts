/**
 * Custom hook for fetching GBP synced data from Supabase
 *
 * Provides access to:
 * - Reviews with ratings and reply status
 * - Analytics snapshots with keywords and impressions
 * - Posts with content and media
 * - Media (photos/videos) with metadata
 * - Synced locations
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  GBPReview,
  GBPAnalyticsSnapshot,
  GBPPost,
  GBPMedia,
  GBPLocationSync,
  GBPStats,
} from '@/app/api/supabase/gbp/route';

interface UseSupabaseGBPResult {
  reviews: GBPReview[];
  analytics: GBPAnalyticsSnapshot[];
  posts: GBPPost[];
  media: GBPMedia[];
  locations: GBPLocationSync[];
  stats: GBPStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSupabaseGBP(locationId?: string): UseSupabaseGBPResult {
  const [reviews, setReviews] = useState<GBPReview[]>([]);
  const [analytics, setAnalytics] = useState<GBPAnalyticsSnapshot[]>([]);
  const [posts, setPosts] = useState<GBPPost[]>([]);
  const [media, setMedia] = useState<GBPMedia[]>([]);
  const [locations, setLocations] = useState<GBPLocationSync[]>([]);
  const [stats, setStats] = useState<GBPStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const url = locationId
        ? `/api/supabase/gbp?locationId=${locationId}`
        : '/api/supabase/gbp';

      const response = await fetch(url);

      if (!response.ok) {
        // Provide more specific error messages based on status code
        if (response.status === 401 || response.status === 403) {
          throw new Error('Please log in to view your GBP data');
        }
        if (response.status === 404) {
          throw new Error('GBP data endpoint not found');
        }
        if (response.status >= 500) {
          throw new Error('Server error - please try again later');
        }
        throw new Error(`Failed to fetch GBP data (status: ${response.status})`);
      }

      const result = await response.json();

      if (result.success) {
        setReviews(result.data.reviews || []);
        setAnalytics(result.data.analytics || []);
        setPosts(result.data.posts || []);
        setMedia(result.data.media || []);
        setLocations(result.data.locations || []);
        setStats(result.stats);
      } else {
        throw new Error(result.message || 'Failed to fetch data');
      }
    } catch (err: any) {
      console.error('[useSupabaseGBP] Error:', err);
      setError(err.message);
      setReviews([]);
      setAnalytics([]);
      setPosts([]);
      setMedia([]);
      setLocations([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    reviews,
    analytics,
    posts,
    media,
    locations,
    stats,
    loading,
    error,
    refetch: fetchData,
  };
}

/**
 * Hook for fetching only GBP reviews from Supabase (CACHED data).
 * For live Google API data, use useLiveGBPReviews from useGBPReviews.ts
 */
export function useSupabaseGBPReviews(locationId?: string) {
  const { reviews, stats, loading, error, refetch } = useSupabaseGBP(locationId);

  return {
    reviews,
    totalReviews: stats?.totalReviews || 0,
    averageRating: stats?.averageRating || 0,
    fiveStarCount: stats?.fiveStarCount || 0,
    oneStarCount: stats?.oneStarCount || 0,
    repliedCount: stats?.repliedCount || 0,
    loading,
    error,
    refetch,
  };
}

/**
 * Hook for fetching only GBP analytics from Supabase (CACHED data).
 * For live Google API data, use useLiveGBPAnalytics from useGBPAnalytics.ts
 */
export function useSupabaseGBPAnalytics(locationId?: string) {
  const { analytics, stats, loading, error, refetch } = useSupabaseGBP(locationId);

  // Get the latest snapshot
  const latestSnapshot = analytics[0] || null;

  return {
    analytics,
    latestSnapshot,
    totalImpressions: stats?.totalImpressions || 0,
    totalKeywords: stats?.totalKeywords || 0,
    topKeywords: stats?.topKeywords || [],
    loading,
    error,
    refetch,
  };
}

/**
 * Hook for fetching only GBP posts from Supabase (CACHED data).
 * For live Google API data, use useLiveGBPPosts from useGBPPosts.ts
 */
export function useSupabaseGBPPosts(locationId?: string) {
  const { posts, stats, loading, error, refetch } = useSupabaseGBP(locationId);

  return {
    posts,
    totalPosts: stats?.totalPosts || 0,
    loading,
    error,
    refetch,
  };
}

/**
 * Hook for fetching only GBP media from Supabase (CACHED data).
 * For live Google API data, use useLiveGBPMedia from useGBPMedia.ts
 */
export function useSupabaseGBPMedia(locationId?: string) {
  const { media, stats, loading, error, refetch } = useSupabaseGBP(locationId);

  return {
    media,
    totalMedia: stats?.totalMedia || 0,
    loading,
    error,
    refetch,
  };
}

// Re-export types for convenience
export type {
  GBPReview,
  GBPAnalyticsSnapshot,
  GBPPost,
  GBPMedia,
  GBPLocationSync,
  GBPStats,
} from '@/app/api/supabase/gbp/route';
