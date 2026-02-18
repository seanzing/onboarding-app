/**
 * useGBPMedia Hook
 *
 * Fetches and manages GBP media items.
 */

import { useState, useEffect, useCallback } from 'react';
import type { GBPMediaItem } from '@/app/types/gbp';

interface UseGBPMediaResult {
  mediaItems: GBPMediaItem[];
  totalCount: number;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

interface GBPMediaResponse {
  success: boolean;
  mediaItems?: GBPMediaItem[];
  totalMediaItemCount?: number;
  nextPageToken?: string;
  error?: string;
}

/**
 * LIVE hook - fetches directly from Google API.
 * For cached/synced data, use useSupabaseGBPMedia from useSupabaseGBP.ts
 */
export function useLiveGBPMedia(
  accountId?: string,
  locationId?: string
): UseGBPMediaResult {
  const [mediaItems, setMediaItems] = useState<GBPMediaItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);

  const fetchMedia = useCallback(async (pageToken?: string) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (accountId) params.set('accountId', accountId);
      if (locationId) params.set('locationId', locationId);
      if (pageToken) params.set('pageToken', pageToken);

      const url = `/api/gbp/media${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url);
      const data: GBPMediaResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch media');
      }

      if (pageToken) {
        setMediaItems((prev) => [...prev, ...(data.mediaItems || [])]);
      } else {
        setMediaItems(data.mediaItems || []);
        setTotalCount(data.totalMediaItemCount || 0);
      }

      setNextPageToken(data.nextPageToken || null);
    } catch (err) {
      console.error('[useGBPMedia] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [accountId, locationId]);

  const loadMore = useCallback(async () => {
    if (nextPageToken) {
      await fetchMedia(nextPageToken);
    }
  }, [nextPageToken, fetchMedia]);

  const refetch = useCallback(async () => {
    await fetchMedia();
  }, [fetchMedia]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  return {
    mediaItems,
    totalCount,
    loading,
    error,
    hasMore: !!nextPageToken,
    loadMore,
    refetch,
  };
}
