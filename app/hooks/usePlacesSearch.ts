/**
 * usePlacesSearch Hook
 *
 * Search for ANY business on Google Maps (no OAuth required).
 * Perfect for prospect research and pre-client lookup.
 *
 * @example
 * const { search, results, loading, error } = usePlacesSearch();
 *
 * // Search by name
 * await search('Route36 Accounting Portland');
 *
 * // Search with location bias
 * await search('accounting firms', { lat: 45.5, lng: -122.6 });
 */

import { useState, useCallback } from 'react';

export interface PlacesSearchResult {
  placeId: string;
  name: string;
  address: string;
  location: { latitude: number; longitude: number };
  rating?: number;
  totalReviews?: number;
  phone?: string;
  website?: string;
  businessStatus?: string;
  category?: string;
  types?: string[];
  priceLevel?: string;
  googleMapsUrl?: string;
  hours?: string[];
  isOpenNow?: boolean;
}

export interface PlacesSearchOptions {
  lat?: number;
  lng?: number;
  type?: string;
  limit?: number;
}

export function usePlacesSearch() {
  const [results, setResults] = useState<PlacesSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, options?: PlacesSearchOptions) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ q: query });
      if (options?.lat) params.append('lat', options.lat.toString());
      if (options?.lng) params.append('lng', options.lng.toString());
      if (options?.type) params.append('type', options.type);
      if (options?.limit) params.append('limit', options.limit.toString());

      const response = await fetch(`/api/places/search?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      setResults(data.businesses || []);
      return data.businesses || [];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      setError(message);
      setResults([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    search,
    results,
    loading,
    error,
    clear,
  };
}

/**
 * usePlaceDetails Hook
 *
 * Get detailed information about a specific business.
 *
 * @example
 * const { getDetails, business, loading, error } = usePlaceDetails();
 * await getDetails('ChIJN1t_tDeuEmsRUsoyG83frY4');
 */
export interface PlaceDetailsResult {
  placeId: string;
  name: string;
  address: string;
  addressComponents?: {
    streetNumber?: string;
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  location: { latitude: number; longitude: number };
  rating?: number;
  totalReviews?: number;
  phone?: string;
  website?: string;
  businessStatus?: string;
  category?: string;
  types?: string[];
  priceLevel?: string;
  googleMapsUrl?: string;
  hours?: {
    weekdays?: string[];
    isOpenNow?: boolean;
    periods?: Array<{
      open: { day: number; hour: number; minute: number };
      close: { day: number; hour: number; minute: number };
    }>;
  };
  reviews?: Array<{
    author: string;
    authorPhoto?: string;
    authorUrl?: string;
    rating: number;
    text?: string;
    time: string;
    publishedAt: string;
  }>;
  photos?: Array<{
    name: string;
    width: number;
    height: number;
    url: string;
    thumbnail: string;
    attribution?: string;
  }>;
}

export function usePlaceDetails() {
  const [business, setBusiness] = useState<PlaceDetailsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDetails = useCallback(async (placeId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/places/${placeId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get place details');
      }

      setBusiness(data.business || null);
      return data.business || null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get details';
      setError(message);
      setBusiness(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setBusiness(null);
    setError(null);
  }, []);

  return {
    getDetails,
    business,
    loading,
    error,
    clear,
  };
}
