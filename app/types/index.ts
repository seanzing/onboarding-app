/**
 * Types Index
 *
 * Centralized exports for all application types.
 * Import from '@/app/types' for cleaner imports.
 *
 * @example
 * import { ApiResponse, GBPLocation, BusinessProfile } from '@/app/types';
 */

// ============================================================
// API RESPONSE TYPES
// ============================================================
export {
  apiSuccess,
  apiError,
  apiPaginated,
  apiSyncResult,
  isApiSuccess,
  isApiError,
  getHttpStatusFromCode,
  ApiErrorCodes,
  type ApiResponse,
  type ApiSuccessResponse,
  type ApiErrorResponse,
  type ApiPaginatedResponse,
  type ApiErrorCode,
  type PaginationMeta,
  type SyncResult,
} from './api';

// ============================================================
// BUSINESS PROFILE TYPES
// ============================================================
export type {
  BusinessProfile,
  BusinessAddress,
  BusinessHours,
  BusinessProfileApiResponse,
} from './business-profile';

// ============================================================
// GBP (GOOGLE BUSINESS PROFILE) TYPES
// ============================================================
export type {
  GBPAccount,
  GBPAccountsResponse,
  GBPLocation,
  GBPCategory,
  GBPServiceType,
  GBPAddress,
  GBPBusinessHours,
  GBPTimePeriod,
  GBPSpecialHours,
  GBPMetadata,
  GBPReview,
  GBPReviewsResponse,
  GBPMediaItem,
  GBPMediaResponse,
  GBPLocalPost,
  GBPLocalPostsResponse,
  GBPSearchKeyword,
  GBPPerformanceMetrics,
  GBPDailyMetrics,
  GBPFeatureEligibility,
  GBPConnectionState,
} from './gbp';

// Also export the utility function
export { determineFeatureEligibility } from './gbp';

// ============================================================
// HUBSPOT TYPES
// ============================================================
export type {
  HubSpotContact,
  HubSpotCompany,
  HubSpotProperty,
  HubSpotApiResponse,
  HubSpotContactsResponse,
  HubSpotCompaniesResponse,
} from './hubspot';

// ============================================================
// SYNC TYPES
// ============================================================
export type {
  SyncResult as SyncStatusResult, // Renamed to avoid conflict with api.ts SyncResult
  SyncLog,
  SupabaseContact,
} from './sync';
