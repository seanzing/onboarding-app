/**
 * Hooks Index
 *
 * Centralized exports for all custom hooks.
 * Organized by data source and functionality.
 *
 * NAMING CONVENTION:
 * - useLive*: Real-time data from external APIs (Google, HubSpot)
 * - useSupabase*: Cached data from Supabase (synced via CRON jobs)
 * - use*: General utility hooks or combined functionality
 */

// ============================================================
// AUTHENTICATION
// ============================================================
export { useAuth, useUser, useSession, useSignOut, useIsAuthenticated } from './useAuth';

// ============================================================
// COMPANIES / CONTACTS (Supabase-backed)
// ============================================================
export { useCompanies } from './useCompanies';
export { useEnrichedBusinesses, getBusinessOpenStatus, formatPhone } from './useEnrichedBusinesses';
export type { EnrichedBusiness, BusinessHours, SocialMedia, BusinessAttributes } from './useEnrichedBusinesses';

// ============================================================
// GOOGLE BUSINESS PROFILE (GBP) - LIVE API HOOKS
// Fetch real-time data directly from Google APIs.
// Use these for current data, write operations, and pagination.
// ============================================================
export { useLiveGBPReviews } from './useLiveGBPReviews';
export { useLiveGBPAnalytics, type GBPKeyword, type GBPAnalytics } from './useLiveGBPAnalytics';
export { useLiveGBPPosts } from './useLiveGBPPosts';
export { useLiveGBPMedia } from './useLiveGBPMedia';

// ============================================================
// GOOGLE BUSINESS PROFILE (GBP) - SUPABASE CACHED HOOKS
// Fetch data synced to Supabase via CRON jobs.
// Use these for historical data and offline access.
// ============================================================
export {
  useSupabaseGBP,
  useSupabaseGBPReviews,
  useSupabaseGBPAnalytics,
  useSupabaseGBPPosts,
  useSupabaseGBPMedia,
  type GBPReview,
  type GBPAnalyticsSnapshot,
  type GBPPost,
  type GBPMedia,
  type GBPLocationSync,
  type GBPStats,
} from './useSupabaseGBP';

// ============================================================
// GBP LOCATIONS & CONNECTION
// ============================================================
export { useGBPLocations, useGBPLocation, type GBPLocation, type GBPLocationsResponse } from './useGBPLocations';
export { useGBPConnection } from './useGBPConnection';
export {
  useGBPOAuthFlow,
  type GBPOAuthFlowOptions,
  type GBPOAuthFlowState,
  type GBPOAuthFlowReturn,
} from './useGBPOAuthFlow';

// ============================================================
// HUBSPOT
// ============================================================
export { useHubSpotAnalytics } from './useHubSpotAnalytics';
export { useCustomerSync } from './useCustomerSync';

// ============================================================
// UTILITIES
// ============================================================
export { usePlacesSearch } from './usePlacesSearch';
