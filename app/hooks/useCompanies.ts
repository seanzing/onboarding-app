'use client';

import useSWR from 'swr';
import { HubSpotContact } from '@/app/types/hubspot';
import { CACHE_KEYS } from '@/lib/cache/invalidate';

/**
 * Hook to fetch and manage HubSpot contacts using SWR
 *
 * Benefits of SWR:
 * - Automatic caching (5 min dedup)
 * - Stale-while-revalidate for instant UI
 * - Auto-refetch on network reconnect
 * - Built-in loading and error states
 *
 * Note: Still named "useCompanies" for backwards compatibility
 */
export function useCompanies() {
  const { data, error, isLoading, mutate } = useSWR<{ data: HubSpotContact[]; timestamp: string }>(
    CACHE_KEYS.CONTACTS,
    {
      // Keep data fresh for 5 minutes
      dedupingInterval: 5 * 60 * 1000,
      // Don't revalidate on focus (reduces API calls)
      revalidateOnFocus: false,
    }
  );

  // Filter out contacts without valid email or name
  const companies = (data?.data || []).filter((contact: HubSpotContact) => {
    const email = contact.properties.email;
    const firstname = contact.properties.firstname;
    const lastname = contact.properties.lastname;
    return email || firstname || lastname;
  });

  // Log on data change (development only)
  if (data && process.env.NODE_ENV === 'development') {
    console.log('[useCompanies] SWR data:', {
      totalContacts: data.data?.length || 0,
      filteredContacts: companies.length,
      timestamp: data.timestamp,
      cached: !isLoading,
    });
  }

  return {
    companies,
    loading: isLoading,
    error: error?.message || null,
    refetch: () => mutate(),
  };
}
