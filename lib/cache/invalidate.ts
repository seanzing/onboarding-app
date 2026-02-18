/**
 * SWR Cache Invalidation Utilities
 *
 * Provides functions to invalidate (revalidate) cached data.
 * Call these after mutations to ensure fresh data is fetched.
 */

import { mutate } from 'swr';

// API endpoint keys for cache invalidation
export const CACHE_KEYS = {
  CONTACTS: '/api/supabase/contacts',
  CONTACT: (id: string) => `/api/hubspot/contacts/${id}`,
  CONTACT_SYNC: (id: string) => `/api/hubspot/contacts/${id}/sync`,
  PLACES_SEARCH: (query: string) => `/api/places/search?q=${encodeURIComponent(query)}`,
  GBP_REVIEWS: '/api/gbp/reviews',
  GBP_LOCATIONS: '/api/gbp/location',
  ONBOARDING_STATUS: (contactId: string) => `/api/onboarding/${contactId}/status`,
} as const;

/**
 * Invalidate all contacts cache
 * Call after contact list changes (add, delete)
 */
export function invalidateContacts() {
  console.log('[Cache] Invalidating contacts cache');
  mutate(CACHE_KEYS.CONTACTS);
}

/**
 * Invalidate a specific contact's cache
 * Call after contact updates
 */
export function invalidateContact(id: string) {
  console.log(`[Cache] Invalidating contact ${id} cache`);
  mutate(CACHE_KEYS.CONTACT(id));
  mutate(CACHE_KEYS.CONTACT_SYNC(id));
  // Also refresh the contacts list
  mutate(CACHE_KEYS.CONTACTS);
}

/**
 * Invalidate GBP reviews cache
 * Call after replying to a review
 */
export function invalidateReviews() {
  console.log('[Cache] Invalidating reviews cache');
  mutate(CACHE_KEYS.GBP_REVIEWS);
}

/**
 * Invalidate GBP locations cache
 * Call after location updates
 */
export function invalidateLocations() {
  console.log('[Cache] Invalidating locations cache');
  mutate(CACHE_KEYS.GBP_LOCATIONS);
}

/**
 * Invalidate a specific Places search cache
 */
export function invalidatePlacesSearch(query: string) {
  console.log(`[Cache] Invalidating places search: "${query}"`);
  mutate(CACHE_KEYS.PLACES_SEARCH(query));
}

/**
 * Invalidate onboarding status cache for a contact
 * Call after service provisioning or status changes
 */
export function invalidateOnboardingStatus(contactId: string) {
  console.log(`[Cache] Invalidating onboarding status for ${contactId}`);
  mutate(CACHE_KEYS.ONBOARDING_STATUS(contactId));
}

/**
 * Invalidate all SWR caches (nuclear option)
 * Use sparingly - only for logout or critical errors
 */
export function invalidateAll() {
  console.log('[Cache] Invalidating ALL caches');
  // This clears the entire SWR cache
  mutate(() => true, undefined, { revalidate: true });
}
