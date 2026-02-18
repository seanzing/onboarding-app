/**
 * Google Business Profile API Client
 *
 * Server-side client for all GBP API calls.
 * Uses direct REST API calls with OAuth2 access tokens.
 * Includes automatic token refresh and retry logic.
 */

import type {
  GBPLocation,
  GBPReviewsResponse,
  GBPMediaResponse,
  GBPLocalPostsResponse,
  GBPPerformanceMetrics,
  GBPAccountsResponse,
  GBPFeatureEligibility,
} from '@/app/types/gbp';
import { getTokenManager } from './token-manager';

// API Base URLs
const API_URLS = {
  accountManagement: 'https://mybusinessaccountmanagement.googleapis.com/v1',
  businessInfo: 'https://mybusinessbusinessinformation.googleapis.com/v1',
  performance: 'https://businessprofileperformance.googleapis.com/v1',
  verifications: 'https://mybusinessverifications.googleapis.com/v1',
  notifications: 'https://mybusinessnotifications.googleapis.com/v1',
  placeActions: 'https://mybusinessplaceactions.googleapis.com/v1',
  legacy: 'https://mybusiness.googleapis.com/v4',
};

export interface GBPClientConfig {
  accessToken: string;
  accountId?: string;
  locationId?: string;
  connectionId?: string; // For automatic token refresh
  maxRetries?: number;
}

export class GBPClient {
  private accessToken: string;
  private accountId?: string;
  private locationId?: string;
  private connectionId?: string;
  private maxRetries: number;

  constructor(config: GBPClientConfig) {
    this.accessToken = config.accessToken;
    this.accountId = config.accountId;
    this.locationId = config.locationId;
    this.connectionId = config.connectionId;
    this.maxRetries = config.maxRetries || 3;
  }

  /**
   * Update access token (used after refresh).
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  // =============================================================================
  // PRIVATE HELPERS
  // =============================================================================

  private async fetch<T>(url: string, options?: RequestInit, retryCount = 0): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const text = await response.text();

    // Check for HTML error page (token expired or invalid endpoint)
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
      if (retryCount < this.maxRetries) {
        console.log(`[GBPClient] HTML response detected, attempting token refresh (retry ${retryCount + 1}/${this.maxRetries})`);
        await this.refreshAndRetry();
        return this.fetch<T>(url, options, retryCount + 1);
      }
      throw new Error('Invalid response - token may be expired. Max retries exceeded.');
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Failed to parse response: ${text.substring(0, 200)}`);
    }

    // Handle 401 Unauthorized - attempt token refresh
    if (response.status === 401 && retryCount < this.maxRetries) {
      console.log(`[GBPClient] 401 Unauthorized, attempting token refresh (retry ${retryCount + 1}/${this.maxRetries})`);
      await this.refreshAndRetry();
      return this.fetch<T>(url, options, retryCount + 1);
    }

    if (!response.ok) {
      const errorMessage = data.error?.message || data.error?.status || JSON.stringify(data);
      throw new Error(`API Error (${response.status}): ${errorMessage}`);
    }

    return data as T;
  }

  /**
   * Refresh token and update client.
   */
  private async refreshAndRetry(): Promise<void> {
    try {
      const tokenManager = getTokenManager();

      if (this.connectionId) {
        // Use connection-specific token
        this.accessToken = await tokenManager.getToken(this.connectionId);
      } else {
        // Use default token (from env)
        this.accessToken = await tokenManager.getDefaultToken();
      }

      console.log('[GBPClient] Token refreshed successfully');
    } catch (error) {
      console.error('[GBPClient] Token refresh failed:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  // =============================================================================
  // ACCOUNT MANAGEMENT API
  // =============================================================================

  async listAccounts(): Promise<GBPAccountsResponse> {
    return this.fetch<GBPAccountsResponse>(`${API_URLS.accountManagement}/accounts`);
  }

  // =============================================================================
  // BUSINESS INFORMATION API
  // =============================================================================

  async getLocation(locationId?: string): Promise<GBPLocation> {
    const id = locationId || this.locationId;
    if (!id) throw new Error('Location ID required');

    const readMask = [
      'name',
      'title',
      'metadata',
      'profile',
      'storefrontAddress',
      'phoneNumbers',
      'websiteUri',
      'categories',
      'regularHours',
      'latlng',
    ].join(',');

    return this.fetch<GBPLocation>(
      `${API_URLS.businessInfo}/locations/${id}?readMask=${readMask}`
    );
  }

  async listLocations(accountId?: string): Promise<{ locations: GBPLocation[] }> {
    const id = accountId || this.accountId;
    if (!id) throw new Error('Account ID required');

    const readMask = [
      'name',
      'title',
      'storefrontAddress',
      'phoneNumbers',
      'websiteUri',
      'categories',
    ].join(',');

    return this.fetch<{ locations: GBPLocation[] }>(
      `${API_URLS.businessInfo}/accounts/${id}/locations?readMask=${readMask}`
    );
  }

  // =============================================================================
  // LEGACY API (Reviews, Media, Posts)
  // =============================================================================

  async getReviews(
    accountId?: string,
    locationId?: string,
    pageToken?: string
  ): Promise<GBPReviewsResponse> {
    const accId = accountId || this.accountId;
    const locId = locationId || this.locationId;
    if (!accId || !locId) throw new Error('Account and Location IDs required');

    let url = `${API_URLS.legacy}/accounts/${accId}/locations/${locId}/reviews`;
    if (pageToken) url += `?pageToken=${pageToken}`;

    return this.fetch<GBPReviewsResponse>(url);
  }

  async replyToReview(
    reviewName: string,
    comment: string
  ): Promise<{ reviewReply: { comment: string; updateTime: string } }> {
    return this.fetch(`${API_URLS.legacy}/${reviewName}/reply`, {
      method: 'PUT',
      body: JSON.stringify({ comment }),
    });
  }

  async deleteReviewReply(reviewName: string): Promise<void> {
    await this.fetch(`${API_URLS.legacy}/${reviewName}/reply`, {
      method: 'DELETE',
    });
  }

  async getMedia(
    accountId?: string,
    locationId?: string,
    pageToken?: string
  ): Promise<GBPMediaResponse> {
    const accId = accountId || this.accountId;
    const locId = locationId || this.locationId;
    if (!accId || !locId) throw new Error('Account and Location IDs required');

    let url = `${API_URLS.legacy}/accounts/${accId}/locations/${locId}/media`;
    if (pageToken) url += `?pageToken=${pageToken}`;

    return this.fetch<GBPMediaResponse>(url);
  }

  async createMedia(
    accountId: string,
    locationId: string,
    mediaData: {
      sourceUrl: string;
      mediaFormat: 'PHOTO' | 'VIDEO';
      locationAssociation?: {
        category: 'COVER' | 'PROFILE' | 'EXTERIOR' | 'INTERIOR' | 'PRODUCT' | 'AT_WORK' | 'FOOD_AND_DRINK' | 'ADDITIONAL';
      };
      description?: string;
    }
  ): Promise<{
    name: string;
    mediaFormat: string;
    sourceUrl?: string;
    googleUrl?: string;
    createTime?: string;
  }> {
    const url = `${API_URLS.legacy}/accounts/${accountId}/locations/${locationId}/media`;

    return this.fetch(url, {
      method: 'POST',
      body: JSON.stringify(mediaData),
    });
  }

  async deleteMedia(mediaName: string): Promise<void> {
    await this.fetch(`${API_URLS.legacy}/${mediaName}`, {
      method: 'DELETE',
    });
  }

  async getLocalPosts(
    accountId?: string,
    locationId?: string,
    pageToken?: string
  ): Promise<GBPLocalPostsResponse> {
    const accId = accountId || this.accountId;
    const locId = locationId || this.locationId;
    if (!accId || !locId) throw new Error('Account and Location IDs required');

    let url = `${API_URLS.legacy}/accounts/${accId}/locations/${locId}/localPosts`;
    if (pageToken) url += `?pageToken=${pageToken}`;

    return this.fetch<GBPLocalPostsResponse>(url);
  }

  // =============================================================================
  // PERFORMANCE API
  // =============================================================================

  async getSearchKeywords(
    locationId?: string,
    startMonth?: { year: number; month: number },
    endMonth?: { year: number; month: number }
  ): Promise<GBPPerformanceMetrics> {
    const id = locationId || this.locationId;
    if (!id) throw new Error('Location ID required');

    // Default to last month
    const now = new Date();
    const end = endMonth || { year: now.getFullYear(), month: now.getMonth() + 1 };
    const start = startMonth || { year: now.getFullYear(), month: now.getMonth() };

    const params = new URLSearchParams({
      'monthlyRange.startMonth.year': start.year.toString(),
      'monthlyRange.startMonth.month': start.month.toString(),
      'monthlyRange.endMonth.year': end.year.toString(),
      'monthlyRange.endMonth.month': end.month.toString(),
    });

    return this.fetch<GBPPerformanceMetrics>(
      `${API_URLS.performance}/locations/${id}/searchkeywords/impressions/monthly?${params}`
    );
  }

  // =============================================================================
  // VERIFICATIONS API
  // =============================================================================

  async listVerifications(locationId?: string): Promise<{
    verifications: Array<{
      name: string;
      method: 'EMAIL' | 'PHONE_CALL' | 'SMS' | 'ADDRESS' | 'VETTED_PARTNER' | 'AUTO';
      state: 'PENDING' | 'COMPLETED' | 'FAILED';
      createTime: string;
    }>;
  }> {
    const id = locationId || this.locationId;
    if (!id) throw new Error('Location ID required');

    return this.fetch(`${API_URLS.verifications}/locations/${id}/verifications`);
  }

  // =============================================================================
  // NOTIFICATIONS API
  // =============================================================================

  async getNotificationSettings(accountId?: string): Promise<{
    name: string;
    pubsubTopic?: string;
    notificationTypes: Array<
      | 'NEW_REVIEW'
      | 'UPDATED_REVIEW'
      | 'NEW_CUSTOMER_MEDIA'
      | 'NEW_QUESTION'
      | 'UPDATED_QUESTION'
      | 'GOOGLE_UPDATE'
      | 'DUPLICATE_LOCATION'
      | 'VOICE_OF_MERCHANT_UPDATED'
    >;
  }> {
    const id = accountId || this.accountId;
    if (!id) throw new Error('Account ID required');

    return this.fetch(`${API_URLS.notifications}/accounts/${id}/notificationSetting`);
  }

  async updateNotificationSettings(
    accountId: string,
    settings: {
      pubsubTopic?: string;
      notificationTypes: string[];
    }
  ): Promise<{ name: string; pubsubTopic?: string; notificationTypes: string[] }> {
    return this.fetch(`${API_URLS.notifications}/accounts/${accountId}/notificationSetting`, {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  }

  // =============================================================================
  // PLACE ACTIONS API
  // =============================================================================

  async listPlaceActionLinks(locationId?: string): Promise<{
    placeActionLinks?: Array<{
      name: string;
      providerType: string;
      isEditable: boolean;
      uri: string;
      placeActionType: string;
      createTime?: string;
      updateTime?: string;
    }>;
  }> {
    const id = locationId || this.locationId;
    if (!id) throw new Error('Location ID required');

    return this.fetch(`${API_URLS.placeActions}/locations/${id}/placeActionLinks`);
  }

  async createPlaceActionLink(
    locationId: string,
    actionLink: {
      uri: string;
      placeActionType: 'APPOINTMENT' | 'ONLINE_APPOINTMENT' | 'DINING_RESERVATION' | 'FOOD_ORDERING' | 'FOOD_DELIVERY' | 'FOOD_TAKEOUT' | 'SHOP_ONLINE';
    }
  ): Promise<{ name: string; uri: string; placeActionType: string }> {
    return this.fetch(`${API_URLS.placeActions}/locations/${locationId}/placeActionLinks`, {
      method: 'POST',
      body: JSON.stringify(actionLink),
    });
  }

  async deletePlaceActionLink(placeActionLinkName: string): Promise<void> {
    await this.fetch(`${API_URLS.placeActions}/${placeActionLinkName}`, {
      method: 'DELETE',
    });
  }

  // =============================================================================
  // CONVENIENCE METHODS
  // =============================================================================

  async getLocationWithEligibility(
    locationId?: string
  ): Promise<{
    location: GBPLocation;
    eligibility: GBPFeatureEligibility;
  }> {
    const location = await this.getLocation(locationId);
    const { determineFeatureEligibility } = await import('@/app/types/gbp');

    const eligibility = determineFeatureEligibility(
      location.metadata,
      location.categories?.primaryCategory?.name
    );

    return { location, eligibility };
  }

  async getFullLocationData(
    accountId?: string,
    locationId?: string
  ): Promise<{
    location: GBPLocation;
    reviews: GBPReviewsResponse;
    media: GBPMediaResponse;
    posts: GBPLocalPostsResponse;
    eligibility: GBPFeatureEligibility;
  }> {
    const accId = accountId || this.accountId;
    const locId = locationId || this.locationId;

    // Fetch all data in parallel
    const [location, reviews, media, posts] = await Promise.all([
      this.getLocation(locId),
      this.getReviews(accId, locId),
      this.getMedia(accId, locId),
      this.getLocalPosts(accId, locId),
    ]);

    const { determineFeatureEligibility } = await import('@/app/types/gbp');
    const eligibility = determineFeatureEligibility(
      location.metadata,
      location.categories?.primaryCategory?.name
    );

    return { location, reviews, media, posts, eligibility };
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createGBPClient(accessToken: string, accountId?: string, locationId?: string): GBPClient {
  return new GBPClient({ accessToken, accountId, locationId });
}
