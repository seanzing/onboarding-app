/**
 * useEnrichedBusinesses Hook
 *
 * Fetches enriched business data from Supabase via API
 * Returns businesses, loading state, error, and refetch function
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface BusinessHours {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
}

export interface SocialMedia {
  facebook: string | null;
  instagram: string | null;
  twitter: string | null;
  linkedin: string | null;
  yelp: string | null;
  tiktok: string | null;
}

export interface BusinessAttributes {
  languages: string[];
  paymentMethods: string[];
  accessibility: string | null;
  parking: string | null;
  yearsInBusiness: string | null;
  license: string | null;
}

export interface EnrichedBusiness {
  id: string;
  hubspot_contact_id: string;
  hubspot_url: string | null;
  business_name: string;
  business_name_alternate: string | null;
  phone: string | null;
  phone_secondary: string | null;
  email: string | null;
  website: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
  service_area: string | null;
  short_description: string | null;
  long_description: string | null;
  categories: string[];
  brightlocal_category_id: number | null;
  business_hours: BusinessHours | null;
  logo: string | null;
  images: string[];
  images_note: string | null;
  social_media: SocialMedia | null;
  attributes: BusinessAttributes | null;
  services: string[];
  certifications: string[];
  notes: string | null;
  enrichment_date: string | null;
  enrichment_sources: string[];
  data_source: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnrichedBusinessesStats {
  total: number;
  withHours: number;
  withImages: number;
  withSocialMedia: number;
  withServices: number;
  withBrightLocalCategory: number;
}

// ============================================================
// HOOK
// ============================================================

export function useEnrichedBusinesses() {
  const [businesses, setBusinesses] = useState<EnrichedBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBusinesses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/supabase/enriched-businesses');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch enriched businesses');
      }

      setBusinesses(result.data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useEnrichedBusinesses] Error:', message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  // Calculate stats
  const stats: EnrichedBusinessesStats = {
    total: businesses.length,
    withHours: businesses.filter((b) => b.business_hours).length,
    withImages: businesses.filter((b) => b.images && b.images.length > 0).length,
    withSocialMedia: businesses.filter(
      (b) => b.social_media && Object.values(b.social_media).some((v) => v)
    ).length,
    withServices: businesses.filter((b) => b.services && b.services.length > 0).length,
    withBrightLocalCategory: businesses.filter((b) => b.brightlocal_category_id).length,
  };

  return {
    businesses,
    loading,
    error,
    stats,
    refetch: fetchBusinesses,
  };
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Check if business is currently open based on hours
 */
export function getBusinessOpenStatus(hours: BusinessHours | null): {
  isOpen: boolean;
  statusText: string;
  todayHours: string;
} {
  if (!hours) {
    return { isOpen: false, statusText: 'Hours unknown', todayHours: '' };
  }

  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[now.getDay()] as keyof BusinessHours;
  const todayHours = hours[today];

  if (!todayHours || todayHours.toLowerCase() === 'closed') {
    return { isOpen: false, statusText: 'Closed today', todayHours: 'Closed' };
  }

  // Parse hours like "9:00 AM - 5:00 PM"
  const match = todayHours.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?\s*-\s*(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
  if (!match) {
    return { isOpen: true, statusText: 'Open', todayHours };
  }

  const parseTime = (hourStr: string, minStr: string, ampm: string): number => {
    let hour = parseInt(hourStr, 10);
    const min = parseInt(minStr || '0', 10);
    if (ampm?.toUpperCase() === 'PM' && hour !== 12) hour += 12;
    if (ampm?.toUpperCase() === 'AM' && hour === 12) hour = 0;
    return hour * 60 + min;
  };

  const openTime = parseTime(match[1], match[2], match[3]);
  const closeTime = parseTime(match[4], match[5], match[6]);
  const currentTime = now.getHours() * 60 + now.getMinutes();

  if (currentTime >= openTime && currentTime < closeTime) {
    return { isOpen: true, statusText: 'Open now', todayHours };
  }

  if (currentTime < openTime) {
    return { isOpen: false, statusText: 'Opens later', todayHours };
  }

  return { isOpen: false, statusText: 'Closed', todayHours };
}

/**
 * Format phone number for display
 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}
