/**
 * HubSpot API Client
 *
 * Provides direct access to HubSpot CRM APIs using the official SDK.
 * Requires HUBSPOT_ACCESS_TOKEN environment variable.
 */

import { Client } from '@hubspot/api-client';

let hubspotClient: Client | null = null;

/**
 * Get HubSpot client instance (lazy initialization)
 * @returns Configured HubSpot API client
 */
export function getHubSpotClient(): Client {
  if (!hubspotClient) {
    const accessToken = process.env.HUBSPOT_ACCESS_TOKEN;

    if (!accessToken) {
      throw new Error(
        'HUBSPOT_ACCESS_TOKEN is not set in environment variables. ' +
        'Please add it to your .env.local file.'
      );
    }

    // Initialize HubSpot client with access token
    hubspotClient = new Client({
      accessToken,
    });

    console.log('[HubSpot Client] Initialized with access token');
  }

  return hubspotClient;
}

/**
 * Check if HubSpot client is properly configured
 * @returns Boolean indicating if client is ready
 */
export function isHubSpotConfigured(): boolean {
  return !!process.env.HUBSPOT_ACCESS_TOKEN;
}
