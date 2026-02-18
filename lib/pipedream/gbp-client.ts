/**
 * Pipedream Google Business Profile API Client
 *
 * Handles all interactions with Pipedream for managing GBP data
 * Uses Pipedream's workflow execution to interact with Google My Business API
 */

import { createClient } from '@supabase/supabase-js';

// Types for GBP data structures
export interface GBPLocation {
  name: string;
  storeCode?: string;
  title?: string;
  phoneNumbers?: {
    primaryPhone?: string;
    additionalPhones?: string[];
  };
  storefrontAddress?: {
    addressLines?: string[];
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
    regionCode?: string;
  };
  websiteUri?: string;
  regularHours?: {
    periods?: Array<{
      openDay: string;
      openTime?: string;
      closeDay?: string;
      closeTime?: string;
    }>;
  };
  categories?: {
    primaryCategory?: {
      displayName: string;
      categoryId?: string;
    };
    additionalCategories?: Array<{
      displayName: string;
      categoryId?: string;
    }>;
  };
  locationState?: {
    isVerified?: boolean;
    isPublished?: boolean;
    isSuspended?: boolean;
    canUpdate?: boolean;
    canDelete?: boolean;
    isDisconnected?: boolean;
  };
  metadata?: {
    duplicateLocation?: string;
    canHaveFoodMenus?: boolean;
  };
}

export interface GBPReview {
  reviewId?: string;
  reviewer?: {
    profilePhotoUrl?: string;
    displayName?: string;
    isAnonymous?: boolean;
  };
  starRating?: 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE';
  comment?: string;
  createTime?: string;
  updateTime?: string;
  reviewReply?: {
    comment?: string;
    updateTime?: string;
  };
}

export interface GBPInsights {
  metric?: string;
  dimensionalValues?: Array<{
    timeDimension?: {
      timeRange?: {
        startTime?: string;
        endTime?: string;
      };
    };
    value?: string;
  }>;
}

interface PipedreamConfig {
  projectId: string;
  apiUrl?: string;
}

export class PipedreamGBPClient {
  private config: PipedreamConfig;
  private supabaseUrl: string;
  private supabaseServiceKey: string;

  constructor(config: PipedreamConfig) {
    this.config = {
      apiUrl: 'https://api.pipedream.com/v1',
      ...config,
    };

    // Get Supabase config from environment
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  }

  /**
   * Execute a Pipedream workflow
   */
  private async executeWorkflow(
    workflowId: string,
    accountId: string,
    data?: any
  ): Promise<any> {
    try {
      // Get the connected account details from Supabase
      const supabase = createClient(this.supabaseUrl, this.supabaseServiceKey);

      const { data: account, error } = await supabase
        .from('pipedream_connected_accounts')
        .select('*')
        .eq('pipedream_account_id', accountId)
        .single();

      if (error || !account) {
        throw new Error('Connected account not found');
      }

      // Execute workflow via Pipedream API
      const response = await fetch(
        `${this.config.apiUrl}/workflows/${workflowId}/executions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Note: You'll need to add a Pipedream API key to env
            'Authorization': `Bearer ${process.env.PIPEDREAM_API_KEY}`,
          },
          body: JSON.stringify({
            account_id: accountId,
            data,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Workflow execution failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[PipedreamGBP] Workflow execution error:', error);
      throw error;
    }
  }

  /**
   * Fetch business profile data
   */
  async getBusinessProfile(accountId: string): Promise<GBPLocation | null> {
    try {
      // Execute Pipedream workflow to get location data
      // This workflow ID should be configured in Pipedream
      const workflowId = process.env.PIPEDREAM_GBP_GET_LOCATION_WORKFLOW_ID || 'p_abc123';

      const result = await this.executeWorkflow(workflowId, accountId);

      if (result?.location) {
        return this.transformToGBPLocation(result.location);
      }

      return null;
    } catch (error) {
      console.error('[PipedreamGBP] Error fetching business profile:', error);
      throw error;
    }
  }

  /**
   * Update business profile data
   */
  async updateBusinessProfile(
    accountId: string,
    updates: Partial<GBPLocation>
  ): Promise<GBPLocation | null> {
    try {
      const workflowId = process.env.PIPEDREAM_GBP_UPDATE_LOCATION_WORKFLOW_ID || 'p_def456';

      const result = await this.executeWorkflow(workflowId, accountId, {
        updateMask: this.buildUpdateMask(updates),
        location: updates,
      });

      if (result?.location) {
        return this.transformToGBPLocation(result.location);
      }

      return null;
    } catch (error) {
      console.error('[PipedreamGBP] Error updating business profile:', error);
      throw error;
    }
  }

  /**
   * Get reviews for the business
   */
  async getReviews(accountId: string): Promise<GBPReview[]> {
    try {
      const workflowId = process.env.PIPEDREAM_GBP_GET_REVIEWS_WORKFLOW_ID || 'p_ghi789';

      const result = await this.executeWorkflow(workflowId, accountId);

      if (result?.reviews) {
        return result.reviews as GBPReview[];
      }

      return [];
    } catch (error) {
      console.error('[PipedreamGBP] Error fetching reviews:', error);
      throw error;
    }
  }

  /**
   * Reply to a review
   */
  async replyToReview(
    accountId: string,
    reviewId: string,
    comment: string
  ): Promise<boolean> {
    try {
      const workflowId = process.env.PIPEDREAM_GBP_REPLY_REVIEW_WORKFLOW_ID || 'p_jkl012';

      const result = await this.executeWorkflow(workflowId, accountId, {
        reviewId,
        comment,
      });

      return result?.success || false;
    } catch (error) {
      console.error('[PipedreamGBP] Error replying to review:', error);
      throw error;
    }
  }

  /**
   * Get business insights/analytics
   */
  async getInsights(
    accountId: string,
    metric: string,
    startDate: string,
    endDate: string
  ): Promise<GBPInsights | null> {
    try {
      const workflowId = process.env.PIPEDREAM_GBP_GET_INSIGHTS_WORKFLOW_ID || 'p_mno345';

      const result = await this.executeWorkflow(workflowId, accountId, {
        metric,
        startDate,
        endDate,
      });

      if (result?.insights) {
        return result.insights as GBPInsights;
      }

      return null;
    } catch (error) {
      console.error('[PipedreamGBP] Error fetching insights:', error);
      throw error;
    }
  }

  /**
   * Create a new post
   */
  async createPost(
    accountId: string,
    text: string,
    mediaUrls?: string[]
  ): Promise<boolean> {
    try {
      const workflowId = process.env.PIPEDREAM_GBP_CREATE_POST_WORKFLOW_ID || 'p_pqr678';

      const result = await this.executeWorkflow(workflowId, accountId, {
        summary: text,
        media: mediaUrls?.map(url => ({ mediaFormat: 'PHOTO', sourceUrl: url })),
      });

      return result?.success || false;
    } catch (error) {
      console.error('[PipedreamGBP] Error creating post:', error);
      throw error;
    }
  }

  /**
   * Upload a photo
   */
  async uploadPhoto(
    accountId: string,
    photoUrl: string,
    category: string
  ): Promise<boolean> {
    try {
      const workflowId = process.env.PIPEDREAM_GBP_UPLOAD_PHOTO_WORKFLOW_ID || 'p_stu901';

      const result = await this.executeWorkflow(workflowId, accountId, {
        sourceUrl: photoUrl,
        category,
      });

      return result?.success || false;
    } catch (error) {
      console.error('[PipedreamGBP] Error uploading photo:', error);
      throw error;
    }
  }

  /**
   * Transform API response to GBPLocation format
   */
  private transformToGBPLocation(data: any): GBPLocation {
    return {
      name: data.name || '',
      storeCode: data.storeCode,
      title: data.title || data.locationName,
      phoneNumbers: {
        primaryPhone: data.primaryPhone,
        additionalPhones: data.additionalPhones,
      },
      storefrontAddress: data.address ? {
        addressLines: data.address.addressLines,
        locality: data.address.locality,
        administrativeArea: data.address.administrativeArea,
        postalCode: data.address.postalCode,
        regionCode: data.address.regionCode,
      } : undefined,
      websiteUri: data.websiteUrl,
      regularHours: data.regularHours,
      categories: data.primaryCategory ? {
        primaryCategory: {
          displayName: data.primaryCategory.displayName,
          categoryId: data.primaryCategory.categoryId,
        },
        additionalCategories: data.additionalCategories,
      } : undefined,
      locationState: data.locationState,
      metadata: data.metadata,
    };
  }

  /**
   * Build update mask for partial updates
   */
  private buildUpdateMask(updates: Partial<GBPLocation>): string[] {
    const mask: string[] = [];

    if (updates.title) mask.push('title');
    if (updates.phoneNumbers?.primaryPhone) mask.push('phoneNumbers.primaryPhone');
    if (updates.storefrontAddress) mask.push('storefrontAddress');
    if (updates.websiteUri) mask.push('websiteUri');
    if (updates.regularHours) mask.push('regularHours');
    if (updates.categories) mask.push('categories');

    return mask;
  }
}

// Export singleton instance
export const pipedreamGBP = new PipedreamGBPClient({
  projectId: process.env.PIPEDREAM_PROJECT_ID || 'proj_OeszJ7n',
});