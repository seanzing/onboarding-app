/**
 * useGBPPosts Hook
 *
 * Fetches and manages GBP local posts.
 */

import { useState, useEffect, useCallback } from 'react';
import type { GBPLocalPost } from '@/app/types/gbp';

interface UseGBPPostsResult {
  posts: GBPLocalPost[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

interface GBPPostsResponse {
  success: boolean;
  localPosts?: GBPLocalPost[];
  nextPageToken?: string;
  error?: string;
}

/**
 * LIVE hook - fetches directly from Google API.
 * For cached/synced data, use useSupabaseGBPPosts from useSupabaseGBP.ts
 */
export function useLiveGBPPosts(
  accountId?: string,
  locationId?: string
): UseGBPPostsResult {
  const [posts, setPosts] = useState<GBPLocalPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);

  const fetchPosts = useCallback(async (pageToken?: string) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (accountId) params.set('accountId', accountId);
      if (locationId) params.set('locationId', locationId);
      if (pageToken) params.set('pageToken', pageToken);

      const url = `/api/gbp/posts${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url);
      const data: GBPPostsResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch posts');
      }

      if (pageToken) {
        setPosts((prev) => [...prev, ...(data.localPosts || [])]);
      } else {
        setPosts(data.localPosts || []);
      }

      setNextPageToken(data.nextPageToken || null);
    } catch (err) {
      console.error('[useGBPPosts] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [accountId, locationId]);

  const loadMore = useCallback(async () => {
    if (nextPageToken) {
      await fetchPosts(nextPageToken);
    }
  }, [nextPageToken, fetchPosts]);

  const refetch = useCallback(async () => {
    await fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return {
    posts,
    loading,
    error,
    hasMore: !!nextPageToken,
    loadMore,
    refetch,
  };
}
