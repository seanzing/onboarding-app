/**
 * useGBPConnection Hook
 *
 * Fetches and manages Google Business Profile connection status for a specific company.
 * Checks if a company (by hubspot_object_id) has a connected GBP account.
 *
 * Data Flow:
 * 1. hubspotObjectId → clients.hubspot_contact_id → clients.id (UUID)
 * 2. clients.id (UUID) → pipedream_connected_accounts.client_id → connection
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

interface GBPConnection {
  id: string;
  pipedream_account_id: string;
  account_name?: string;
  account_email?: string;
  healthy: boolean;
  created_at: string;
  metadata?: any;
}

/**
 * Helper to look up the client UUID from HubSpot contact ID.
 * The pipedream_connected_accounts.client_id is a UUID FK to clients.id,
 * not a HubSpot numeric ID.
 */
async function getClientUuidFromHubspotId(hubspotObjectId: string): Promise<string | null> {
  const { data: client, error } = await supabase
    .from('clients')
    .select('id')
    .eq('hubspot_contact_id', hubspotObjectId)
    .single();

  if (error) {
    // PGRST116 = no rows found, which is OK
    if (error.code !== 'PGRST116') {
      console.warn('[useGBPConnection] Error looking up client UUID:', error);
    }
    return null;
  }

  return client?.id || null;
}

export function useGBPConnection(hubspotObjectId: string | undefined) {
  const [connection, setConnection] = useState<GBPConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hubspotObjectId) {
      setLoading(false);
      return;
    }

    async function fetchConnection() {
      try {
        setLoading(true);
        setError(null);

        console.log('[useGBPConnection] Checking for GBP connection for company:', hubspotObjectId);

        // Step 1: Look up the client UUID from the HubSpot contact ID
        // The clients table links hubspot_contact_id (TEXT) to id (UUID)
        // Note: hubspotObjectId is guaranteed non-null here due to early return above
        const clientUuid = await getClientUuidFromHubspotId(hubspotObjectId!);

        if (!clientUuid) {
          console.log('[useGBPConnection] No client found for HubSpot ID:', hubspotObjectId);
          setConnection(null);
          return;
        }

        console.log('[useGBPConnection] Found client UUID:', clientUuid);

        // Step 2: Query pipedream_connected_accounts using the client UUID
        const { data, error: queryError } = await supabase
          .from('pipedream_connected_accounts')
          .select('*')
          .eq('client_id', clientUuid)
          .eq('app_name', 'google_my_business')
          .single();

        if (queryError) {
          // PGRST116 means no rows found - this is OK, just no connection yet
          if (queryError.code === 'PGRST116') {
            console.log('[useGBPConnection] No GBP connection found for client');
            setConnection(null);
          } else {
            throw queryError;
          }
        } else if (data) {
          console.log('[useGBPConnection] Found GBP connection:', data);
          setConnection(data);
        }
      } catch (err: any) {
        console.error('[useGBPConnection] Error fetching connection:', err);
        setError(err.message || 'Failed to fetch GBP connection');
      } finally {
        setLoading(false);
      }
    }

    fetchConnection();
  }, [hubspotObjectId]);

  const refetch = async () => {
    if (!hubspotObjectId) return;

    try {
      setLoading(true);
      setError(null);

      // Step 1: Look up the client UUID from the HubSpot contact ID
      // Note: hubspotObjectId is guaranteed non-null here due to early return above
      const clientUuid = await getClientUuidFromHubspotId(hubspotObjectId!);

      if (!clientUuid) {
        setConnection(null);
        return;
      }

      // Step 2: Query with the correct UUID
      const { data, error: queryError } = await supabase
        .from('pipedream_connected_accounts')
        .select('*')
        .eq('client_id', clientUuid)
        .eq('app_name', 'google_my_business')
        .single();

      if (queryError) {
        if (queryError.code === 'PGRST116') {
          setConnection(null);
        } else {
          throw queryError;
        }
      } else if (data) {
        setConnection(data);
      }
    } catch (err: any) {
      console.error('[useGBPConnection] Error refetching connection:', err);
      setError(err.message || 'Failed to refetch GBP connection');
    } finally {
      setLoading(false);
    }
  };

  return {
    connection,
    loading,
    error,
    refetch,
    isConnected: !!connection,
  };
}
