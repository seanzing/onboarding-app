/**
 * useGBPReviews Hook
 *
 * Fetches and manages GBP reviews with reply functionality.
 */

import { useState, useEffect, useCallback } from 'react';
import type { GBPReview } from '@/app/types/gbp';

interface UseGBPReviewsResult {
  reviews: GBPReview[];
  totalCount: number;
  averageRating: number | null;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
  replyToReview: (reviewName: string, comment: string) => Promise<boolean>;
}

interface GBPReviewsResponse {
  success: boolean;
  reviews?: GBPReview[];
  totalReviewCount?: number;
  averageRating?: number;
  nextPageToken?: string;
  error?: string;
}

/**
 * LIVE hook - fetches directly from Google API.
 * For cached/synced data, use useSupabaseGBPReviews from useSupabaseGBP.ts
 */
export function useLiveGBPReviews(
  accountId?: string,
  locationId?: string
): UseGBPReviewsResult {
  const [reviews, setReviews] = useState<GBPReview[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);

  const fetchReviews = useCallback(async (pageToken?: string) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (accountId) params.set('accountId', accountId);
      if (locationId) params.set('locationId', locationId);
      if (pageToken) params.set('pageToken', pageToken);

      const url = `/api/gbp/reviews${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url);
      const data: GBPReviewsResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch reviews');
      }

      if (pageToken) {
        // Append to existing reviews
        setReviews((prev) => [...prev, ...(data.reviews || [])]);
      } else {
        // Replace reviews
        setReviews(data.reviews || []);
        setTotalCount(data.totalReviewCount || 0);
        setAverageRating(data.averageRating || null);
      }

      setNextPageToken(data.nextPageToken || null);
    } catch (err) {
      console.error('[useGBPReviews] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [accountId, locationId]);

  const loadMore = useCallback(async () => {
    if (nextPageToken) {
      await fetchReviews(nextPageToken);
    }
  }, [nextPageToken, fetchReviews]);

  const refetch = useCallback(async () => {
    await fetchReviews();
  }, [fetchReviews]);

  const replyToReview = useCallback(async (reviewName: string, comment: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/gbp/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewName, comment }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to reply');
      }

      // Refetch reviews to get updated data
      await refetch();
      return true;
    } catch (err) {
      console.error('[useGBPReviews] Reply error:', err);
      setError(err instanceof Error ? err.message : 'Failed to reply');
      return false;
    }
  }, [refetch]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  return {
    reviews,
    totalCount,
    averageRating,
    loading,
    error,
    hasMore: !!nextPageToken,
    loadMore,
    refetch,
    replyToReview,
  };
}
