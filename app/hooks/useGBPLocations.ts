/**
 * Custom hook for managing GBP locations
 */

import { useState, useEffect } from 'react';

export interface GBPLocation {
  name: string; // "locations/ChIJxxx"
  title?: string;
  storefrontAddress?: {
    addressLines?: string[];
    locality?: string; // City
    administrativeArea?: string; // State
    postalCode?: string;
    regionCode?: string; // Country code
  };
  phoneNumbers?: {
    primaryPhone?: string;
    additionalPhones?: string[];
  };
  websiteUri?: string;
  regularHours?: {
    periods?: Array<{
      openDay?: string;
      openTime?: string;
      closeDay?: string;
      closeTime?: string;
    }>;
  };
  categories?: {
    primaryCategory?: {
      displayName?: string;
      categoryId?: string;
    };
    additionalCategories?: Array<{
      displayName?: string;
      categoryId?: string;
    }>;
  };
  metadata?: {
    mapsUri?: string;
    newReviewUri?: string;
  };
  profile?: {
    description?: string;
  };
}

export interface GBPLocationsResponse {
  success: boolean;
  accountId: string;
  accountName: string;
  gbpAccountId: string;
  gbpAccount?: any; // Full account info from Account Management API
  locations: GBPLocation[];
  count: number;
  warning?: {
    message: string;
    reason: string;
    verificationState?: string;
    accountType?: string;
  };
}

export function useGBPLocations(accountId: string | null) {
  const [locations, setLocations] = useState<GBPLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<GBPLocationsResponse['warning'] | null>(null);
  const [accountInfo, setAccountInfo] = useState<any>(null);

  const fetchLocations = async () => {
    if (!accountId) {
      setLocations([]);
      setWarning(null);
      setAccountInfo(null);
      return;
    }

    setLoading(true);
    setError(null);
    setWarning(null);

    try {
      const response = await fetch(`/api/gbp/${accountId}/locations`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch locations');
      }

      const data: GBPLocationsResponse = await response.json();

      // Handle successful response (even if locations are empty)
      if (data.success) {
        setLocations(data.locations || []);
        setWarning(data.warning || null);
        setAccountInfo(data.gbpAccount || null);
      } else {
        throw new Error('Failed to fetch locations');
      }
    } catch (err: any) {
      console.error('[useGBPLocations] Error:', err);
      setError(err.message);
      setLocations([]);
      setWarning(null);
      setAccountInfo(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, [accountId]);

  return {
    locations,
    loading,
    error,
    warning,
    accountInfo,
    refetch: fetchLocations,
  };
}

export function useGBPLocation(accountId: string | null, locationId: string | null) {
  const [location, setLocation] = useState<GBPLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchLocation = async () => {
    if (!accountId || !locationId) {
      setLocation(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/gbp/${accountId}/locations/${locationId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch location');
      }

      const data = await response.json();
      setLocation(data.location);
    } catch (err: any) {
      console.error('[useGBPLocation] Error:', err);
      setError(err.message);
      setLocation(null);
    } finally {
      setLoading(false);
    }
  };

  const updateLocation = async (updates: Partial<GBPLocation>) => {
    if (!accountId || !locationId) {
      throw new Error('Missing accountId or locationId');
    }

    setUpdating(true);
    setError(null);

    try {
      const response = await fetch(`/api/gbp/${accountId}/locations/${locationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update location');
      }

      const data = await response.json();
      setLocation(data.location);

      return data.location;
    } catch (err: any) {
      console.error('[useGBPLocation] Update error:', err);
      setError(err.message);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchLocation();
  }, [accountId, locationId]);

  return {
    location,
    loading,
    error,
    updating,
    refetch: fetchLocation,
    updateLocation,
  };
}
