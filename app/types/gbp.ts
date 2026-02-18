/**
 * Google Business Profile API Types
 *
 * TypeScript interfaces for GBP data structures, based on:
 * - Business Information API v1 (locations, metadata)
 * - Legacy My Business API v4 (reviews, media, posts)
 * - Performance API (search keywords, metrics)
 */

// =============================================================================
// LOCATION & METADATA
// =============================================================================

export interface GBPLocation {
  name: string; // locations/{locationId}
  title: string;
  phoneNumbers?: {
    primaryPhone?: string;
    additionalPhones?: string[];
  };
  categories?: {
    primaryCategory?: GBPCategory;
    additionalCategories?: GBPCategory[];
  };
  websiteUri?: string;
  regularHours?: GBPBusinessHours;
  specialHours?: GBPSpecialHours;
  storefrontAddress?: GBPAddress;
  metadata?: GBPMetadata;
  profile?: {
    description?: string;
  };
  latlng?: {
    latitude: number;
    longitude: number;
  };
}

export interface GBPCategory {
  name: string; // categories/gcid:software_company
  displayName: string;
  serviceTypes?: GBPServiceType[];
  moreHoursTypes?: {
    hoursTypeId: string;
    displayName: string;
    localizedDisplayName: string;
  }[];
}

export interface GBPServiceType {
  serviceTypeId: string;
  displayName: string;
}

export interface GBPAddress {
  regionCode?: string;
  languageCode?: string;
  postalCode?: string;
  sortingCode?: string;
  administrativeArea?: string; // State
  locality?: string; // City
  sublocality?: string;
  addressLines?: string[];
  recipients?: string[];
  organization?: string;
}

export interface GBPBusinessHours {
  periods: GBPTimePeriod[];
}

export interface GBPTimePeriod {
  openDay: string; // MONDAY, TUESDAY, etc.
  openTime: { hours?: number; minutes?: number };
  closeDay: string;
  closeTime: { hours?: number; minutes?: number };
}

export interface GBPSpecialHours {
  specialHourPeriods: {
    startDate: { year: number; month: number; day: number };
    endDate?: { year: number; month: number; day: number };
    openTime?: { hours?: number; minutes?: number };
    closeTime?: { hours?: number; minutes?: number };
    isClosed?: boolean;
  }[];
}

export interface GBPMetadata {
  canDelete?: boolean;
  canModifyServiceList?: boolean;
  canHaveBusinessCalls?: boolean;
  hasVoiceOfMerchant?: boolean;
  placeId?: string;
  mapsUri?: string;
  newReviewUri?: string;
}

// =============================================================================
// REVIEWS
// =============================================================================

export interface GBPReview {
  name: string; // accounts/{accountId}/locations/{locationId}/reviews/{reviewId}
  reviewId: string;
  reviewer: {
    profilePhotoUrl?: string;
    displayName: string;
    isAnonymous?: boolean;
  };
  starRating: 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE';
  comment?: string;
  createTime: string; // ISO 8601
  updateTime?: string;
  reviewReply?: {
    comment: string;
    updateTime: string;
  };
}

export interface GBPReviewsResponse {
  reviews?: GBPReview[];
  averageRating?: number;
  totalReviewCount?: number;
  nextPageToken?: string;
}

// =============================================================================
// MEDIA
// =============================================================================

export interface GBPMediaItem {
  name: string; // accounts/{accountId}/locations/{locationId}/media/{mediaId}
  mediaFormat: 'PHOTO' | 'VIDEO';
  googleUrl?: string;
  thumbnailUrl?: string;
  createTime: string;
  dimensions?: {
    widthPixels: number;
    heightPixels: number;
  };
  insights?: {
    viewCount?: string;
  };
  attribution?: {
    profileName?: string;
    profilePhotoUrl?: string;
  };
  description?: string;
  locationAssociation?: {
    category?: string; // COVER, PROFILE, ADDITIONAL, etc.
  };
}

export interface GBPMediaResponse {
  mediaItems?: GBPMediaItem[];
  totalMediaItemCount?: number;
  nextPageToken?: string;
}

// =============================================================================
// LOCAL POSTS (Google Posts)
// =============================================================================

export interface GBPLocalPost {
  name: string; // accounts/{accountId}/locations/{locationId}/localPosts/{postId}
  languageCode?: string;
  summary?: string;
  callToAction?: {
    actionType: 'ACTION_TYPE_UNSPECIFIED' | 'BOOK' | 'ORDER' | 'SHOP' | 'LEARN_MORE' | 'SIGN_UP' | 'GET_OFFER' | 'CALL';
    url?: string;
  };
  createTime: string;
  updateTime?: string;
  event?: {
    title: string;
    schedule: {
      startDate: { year: number; month: number; day: number };
      startTime?: { hours: number; minutes?: number };
      endDate: { year: number; month: number; day: number };
      endTime?: { hours: number; minutes?: number };
    };
  };
  state: 'LOCAL_POST_STATE_UNSPECIFIED' | 'REJECTED' | 'LIVE' | 'PROCESSING';
  media?: {
    mediaFormat: 'PHOTO' | 'VIDEO';
    sourceUrl: string;
  }[];
  searchUrl?: string;
  topicType?: 'LOCAL_POST_TOPIC_TYPE_UNSPECIFIED' | 'STANDARD' | 'EVENT' | 'OFFER' | 'ALERT';
  alertType?: 'ALERT_TYPE_UNSPECIFIED' | 'COVID_19';
  offer?: {
    couponCode?: string;
    redeemOnlineUrl?: string;
    termsConditions?: string;
  };
}

export interface GBPLocalPostsResponse {
  localPosts?: GBPLocalPost[];
  nextPageToken?: string;
}

// =============================================================================
// PERFORMANCE METRICS
// =============================================================================

export interface GBPSearchKeyword {
  searchKeyword: string;
  insightsValue: {
    value?: string;
    threshold?: string;
  };
}

export interface GBPPerformanceMetrics {
  searchKeywordsCounts?: GBPSearchKeyword[];
  nextPageToken?: string;
}

export interface GBPDailyMetrics {
  dailyMetric: string;
  timeSeries: {
    datedValues: {
      date: { year: number; month: number; day: number };
      value?: string;
    }[];
  };
}

// =============================================================================
// FEATURE ELIGIBILITY
// =============================================================================

export interface GBPFeatureEligibility {
  reviews: boolean;
  media: boolean;
  localPosts: boolean;
  performance: boolean;
  serviceList: boolean;
  foodMenus: boolean;
  healthData: boolean;
  lodgingData: boolean;
}

export function determineFeatureEligibility(
  metadata: GBPMetadata | undefined,
  categoryName: string | undefined
): GBPFeatureEligibility {
  const category = categoryName?.toLowerCase() || '';

  return {
    reviews: true, // Always available via Legacy API
    media: true, // Always available via Legacy API
    localPosts: true, // Available via Legacy API
    performance: true, // Always available via Performance API
    serviceList: metadata?.canModifyServiceList ?? false,
    foodMenus: category.includes('restaurant') || category.includes('food'),
    healthData: category.includes('doctor') || category.includes('medical') || category.includes('health'),
    lodgingData: category.includes('hotel') || category.includes('lodging'),
  };
}

// =============================================================================
// API RESPONSE WRAPPERS
// =============================================================================

export interface GBPAccount {
  name: string; // accounts/{accountId}
  accountName: string;
  type: 'PERSONAL' | 'LOCATION_GROUP' | 'USER_GROUP' | 'ORGANIZATION';
  role?: 'PRIMARY_OWNER' | 'OWNER' | 'MANAGER' | 'SITE_MANAGER';
  verificationState?: 'VERIFICATION_STATE_UNSPECIFIED' | 'VERIFIED' | 'UNVERIFIED' | 'VERIFICATION_REQUESTED';
  vettedState?: 'VETTED_STATE_UNSPECIFIED' | 'NOT_VETTED' | 'VETTED' | 'INVALID';
}

export interface GBPAccountsResponse {
  accounts?: GBPAccount[];
  nextPageToken?: string;
}

// =============================================================================
// CLIENT STATE
// =============================================================================

export interface GBPConnectionState {
  isConnected: boolean;
  accountId?: string;
  locationId?: string;
  locationTitle?: string;
  metadata?: GBPMetadata;
  eligibility?: GBPFeatureEligibility;
  lastSyncAt?: string;
  error?: string;
}
