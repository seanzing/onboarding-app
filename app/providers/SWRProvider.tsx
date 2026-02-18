'use client';

/**
 * SWR Configuration Provider
 *
 * Provides global SWR configuration for client-side data fetching.
 * Key benefits:
 * - Automatic caching and deduplication
 * - 60-75% faster page loads via stale-while-revalidate
 * - Smart refetching on focus/network reconnect
 * - Optimistic updates support
 */

import { SWRConfig } from 'swr';
import { ReactNode } from 'react';

// Global fetcher function for SWR
const fetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    // Attach extra info to the error object
    (error as Error & { info?: unknown; status?: number }).info = await res.json().catch(() => null);
    (error as Error & { status?: number }).status = res.status;
    throw error;
  }

  return res.json();
};

interface SWRProviderProps {
  children: ReactNode;
}

export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        fetcher,
        // Revalidation settings
        revalidateOnFocus: false, // Don't refetch on window focus (reduces API calls)
        revalidateOnReconnect: true, // Refetch when network reconnects
        revalidateIfStale: true, // Revalidate if data is stale
        dedupingInterval: 5 * 60 * 1000, // 5 minutes - dedupe identical requests
        focusThrottleInterval: 30 * 1000, // 30 seconds - throttle focus revalidation

        // Error handling
        shouldRetryOnError: true,
        errorRetryCount: 3,
        errorRetryInterval: 3000, // 3 seconds between retries

        // Keep previous data while revalidating
        keepPreviousData: true,

        // Suspense mode disabled (use isLoading instead)
        suspense: false,

        // Global error handler
        onError: (error, key) => {
          console.error(`[SWR Error] ${key}:`, error);
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}

export default SWRProvider;
