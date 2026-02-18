/**
 * GBP Token Manager
 *
 * Handles automatic token refresh and caching for Google Business Profile API.
 * Uses Pipedream Connect SDK for secure token management.
 *
 * Architecture: Hybrid Secure
 * - Tokens are stored and managed by Pipedream (not our database)
 * - We retrieve tokens via authenticated SDK calls when needed
 * - Automatic token refresh is handled by Pipedream
 */

import { createClient } from '@supabase/supabase-js';
import { PipedreamClient } from '@pipedream/sdk';

interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  connectionId: string;
}

interface TokenRefreshResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token?: string;
}

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // Refresh 5 minutes before expiry

class GBPTokenManager {
  private static instance: GBPTokenManager;
  private tokenCache: Map<string, TokenData> = new Map();
  private refreshPromises: Map<string, Promise<string>> = new Map();
  private supabase;

  private constructor() {
    // Initialize Supabase client for server-side token storage
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  static getInstance(): GBPTokenManager {
    if (!GBPTokenManager.instance) {
      GBPTokenManager.instance = new GBPTokenManager();
    }
    return GBPTokenManager.instance;
  }

  /**
   * Get a valid access token for a connection.
   * Automatically refreshes if expired or about to expire.
   */
  async getToken(connectionId: string): Promise<string> {
    // Check cache first
    const cached = this.tokenCache.get(connectionId);
    if (cached && !this.isExpiringSoon(cached)) {
      return cached.accessToken;
    }

    // Check if refresh is already in progress (prevents duplicate refreshes)
    const existingRefresh = this.refreshPromises.get(connectionId);
    if (existingRefresh) {
      return existingRefresh;
    }

    // Start refresh
    const refreshPromise = this.refreshToken(connectionId);
    this.refreshPromises.set(connectionId, refreshPromise);

    try {
      const token = await refreshPromise;
      return token;
    } finally {
      this.refreshPromises.delete(connectionId);
    }
  }

  /**
   * Get token from environment variable (legacy support).
   * Uses the default connection for backwards compatibility.
   */
  async getDefaultToken(): Promise<string> {
    // First, try environment variable (for development)
    const envToken = process.env.GBP_ACCESS_TOKEN;
    const envRefreshToken = process.env.GBP_REFRESH_TOKEN;

    if (envToken && envRefreshToken) {
      // Check if we have this cached
      const cached = this.tokenCache.get('default');
      if (cached && !this.isExpiringSoon(cached)) {
        return cached.accessToken;
      }

      // Refresh using env refresh token
      try {
        const newToken = await this.refreshWithCredentials(envRefreshToken);
        this.tokenCache.set('default', {
          accessToken: newToken,
          refreshToken: envRefreshToken,
          expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
          connectionId: 'default',
        });
        return newToken;
      } catch (error) {
        console.error('[TokenManager] Failed to refresh default token:', error);
        // Return existing token as fallback
        if (envToken) return envToken;
        throw error;
      }
    }

    if (envToken) {
      return envToken;
    }

    throw new Error('No GBP access token configured. Set GBP_ACCESS_TOKEN in .env.local');
  }

  /**
   * Refresh token for a specific connection.
   * Uses Pipedream for token management (they handle refresh automatically).
   */
  private async refreshToken(connectionId: string): Promise<string> {
    console.log(`[TokenManager] Refreshing token for connection: ${connectionId}`);

    // Fetch connection from pipedream_connected_accounts table
    const { data: connection, error } = await this.supabase
      .from('pipedream_connected_accounts')
      .select('*')
      .or(`id.eq.${connectionId},pipedream_account_id.eq.${connectionId}`)
      .single();

    if (error || !connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    // All connections now use Pipedream for token management
    // Pipedream handles token refresh automatically
    return this.getTokenFromPipedream(connection.pipedream_account_id, connection.external_id);
  }

  /**
   * Refresh token using Google OAuth directly.
   */
  private async refreshWithCredentials(refreshToken: string): Promise<string> {
    const clientId = process.env.GBP_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GBP_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Missing Google OAuth credentials for token refresh');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TokenManager] Token refresh failed:', errorText);
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const data: TokenRefreshResponse = await response.json();
    console.log('[TokenManager] Token refreshed successfully');

    return data.access_token;
  }

  /**
   * Fetch token from Pipedream Connect using the SDK.
   * Pipedream automatically handles token refresh, we just fetch the current token.
   *
   * This is the preferred method - uses authenticated SDK calls instead of direct REST.
   */
  async getTokenFromPipedream(pipedreamAccountId: string, externalUserId?: string): Promise<string> {
    const projectId = process.env.PIPEDREAM_PROJECT_ID;
    const clientId = process.env.PIPEDREAM_CLIENT_ID;
    const clientSecret = process.env.PIPEDREAM_CLIENT_SECRET;

    if (!projectId || !clientId || !clientSecret) {
      throw new Error('Missing Pipedream credentials (PROJECT_ID, CLIENT_ID, or CLIENT_SECRET)');
    }

    console.log(`[TokenManager] Fetching token from Pipedream for account: ${pipedreamAccountId}`);

    // Use Pipedream SDK (tested and verified to work)
    const client = new PipedreamClient({
      projectId,
      clientId,
      clientSecret,
    });

    try {
      // Retrieve account with credentials included
      const account = await client.accounts.retrieve(pipedreamAccountId, {
        includeCredentials: true,
        ...(externalUserId && { externalUserId }),
      });

      // Type assertion since SDK types don't include credentials
      const accountWithCreds = account as { credentials?: { oauth_access_token?: string } };
      const accessToken = accountWithCreds.credentials?.oauth_access_token;

      if (!accessToken) {
        console.error('[TokenManager] No access token in Pipedream response:', account);
        throw new Error('No access token found in Pipedream account response');
      }

      console.log('[TokenManager] Successfully retrieved token from Pipedream');
      return accessToken;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[TokenManager] Pipedream SDK error:', errorMessage);
      throw new Error(`Pipedream token fetch failed: ${errorMessage}`);
    }
  }

  /**
   * Check if token is expiring soon (within buffer time).
   */
  private isExpiringSoon(token: TokenData): boolean {
    return token.expiresAt.getTime() - Date.now() < TOKEN_REFRESH_BUFFER_MS;
  }

  /**
   * Clear cached token (useful when token is invalidated).
   */
  clearCache(connectionId?: string): void {
    if (connectionId) {
      this.tokenCache.delete(connectionId);
    } else {
      this.tokenCache.clear();
    }
  }

  /**
   * Store a new token in cache (called after OAuth callback).
   */
  cacheToken(connectionId: string, accessToken: string, refreshToken: string, expiresIn: number): void {
    this.tokenCache.set(connectionId, {
      accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
      connectionId,
    });
  }
}

// Export singleton instance getter
export function getTokenManager(): GBPTokenManager {
  return GBPTokenManager.getInstance();
}

// Export convenience function for getting default token (from env vars)
export async function getGBPAccessToken(): Promise<string> {
  return GBPTokenManager.getInstance().getDefaultToken();
}

// Export for getting connection-specific token (from database)
export async function getConnectionToken(connectionId: string): Promise<string> {
  return GBPTokenManager.getInstance().getToken(connectionId);
}

// Export for getting token directly from Pipedream account
export async function getPipedreamAccountToken(pipedreamAccountId: string): Promise<string> {
  return GBPTokenManager.getInstance().getTokenFromPipedream(pipedreamAccountId);
}
