/**
 * Supabase GBP Data API
 *
 * GET /api/supabase/gbp
 *
 * Fetches all synced GBP data from Supabase:
 * - Reviews (gbp_reviews)
 * - Analytics snapshots (gbp_analytics_snapshots)
 * - Posts (gbp_posts)
 * - Media (gbp_media)
 * - Locations (gbp_locations_sync)
 *
 * Query params:
 * - locationId: Filter by specific location
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy initialization - create Supabase client only at runtime, not build time
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Response types
export interface GBPReview {
  id: string;
  account_id: string;
  location_id: string;
  review_id: string;
  reviewer_display_name: string | null;
  reviewer_profile_photo_url: string | null;
  star_rating: number | null;
  comment: string | null;
  reply_comment: string | null;
  reply_update_time: string | null;
  create_time: string | null;
  update_time: string | null;
  fetched_at: string;
}

export interface GBPAnalyticsSnapshot {
  id: string;
  location_id: string;
  snapshot_date: string;
  date_range_start: string | null;
  date_range_end: string | null;
  total_impressions: number;
  total_keywords: number;
  keywords: {
    keyword: string;
    impressions: number;
    threshold?: string;
  }[];
  fetched_at: string;
}

export interface GBPPost {
  id: string;
  account_id: string;
  location_id: string;
  post_name: string;
  summary: string | null;
  language_code: string | null;
  topic_type: string | null;
  call_to_action_type: string | null;
  call_to_action_url: string | null;
  event_title: string | null;
  event_start_date: string | null;
  event_end_date: string | null;
  offer_coupon_code: string | null;
  offer_redeem_online_url: string | null;
  offer_terms_conditions: string | null;
  media_url: string | null;
  media_format: string | null;
  state: string | null;
  create_time: string | null;
  update_time: string | null;
  fetched_at: string;
}

export interface GBPMedia {
  id: string;
  account_id: string;
  location_id: string;
  media_name: string;
  media_format: string | null;
  location_association: string | null;
  google_url: string | null;
  thumbnail_url: string | null;
  source_url: string | null;
  width_pixels: number | null;
  height_pixels: number | null;
  attribution_profile_name: string | null;
  attribution_profile_url: string | null;
  view_count: number;
  create_time: string | null;
  fetched_at: string;
}

export interface GBPLocationSync {
  id: string;
  account_id: string;
  location_id: string;
  location_name: string | null;
  hubspot_contact_id: string | null;
  title: string | null;
  store_code: string | null;
  address_lines: string[] | null;
  locality: string | null;
  administrative_area: string | null;
  postal_code: string | null;
  country_code: string | null;
  primary_phone: string | null;
  website_uri: string | null;
  primary_category_id: string | null;
  primary_category_name: string | null;
  additional_categories: any[];
  verification_state: string | null;
  is_open: boolean;
  metadata: Record<string, any>;
  create_time: string | null;
  update_time: string | null;
  fetched_at: string;
}

export interface GBPStats {
  totalReviews: number;
  averageRating: number;
  fiveStarCount: number;
  oneStarCount: number;
  repliedCount: number;
  totalPosts: number;
  totalMedia: number;
  totalImpressions: number;
  totalKeywords: number;
  topKeywords: { keyword: string; impressions: number }[];
  lastSyncDate: string | null;
}

interface GBPDataResponse {
  success: boolean;
  data: {
    reviews: GBPReview[];
    analytics: GBPAnalyticsSnapshot[];
    posts: GBPPost[];
    media: GBPMedia[];
    locations: GBPLocationSync[];
  };
  stats: GBPStats;
  locationId?: string;
  message?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<GBPDataResponse>> {
  const supabase = getSupabaseAdmin();
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');

    console.log('[API /api/supabase/gbp] Fetching GBP data from Supabase', locationId ? `for location: ${locationId}` : '');

    // Build queries with optional location filter
    let reviewsQuery = supabase
      .from('gbp_reviews')
      .select('*')
      .order('create_time', { ascending: false });

    let analyticsQuery = supabase
      .from('gbp_analytics_snapshots')
      .select('*')
      .order('snapshot_date', { ascending: false });

    let postsQuery = supabase
      .from('gbp_posts')
      .select('*')
      .order('create_time', { ascending: false });

    let mediaQuery = supabase
      .from('gbp_media')
      .select('*')
      .order('create_time', { ascending: false });

    let locationsQuery = supabase
      .from('gbp_locations_sync')
      .select('*')
      .order('fetched_at', { ascending: false });

    // Apply location filter if provided
    if (locationId) {
      reviewsQuery = reviewsQuery.eq('location_id', locationId);
      analyticsQuery = analyticsQuery.eq('location_id', locationId);
      postsQuery = postsQuery.eq('location_id', locationId);
      mediaQuery = mediaQuery.eq('location_id', locationId);
      locationsQuery = locationsQuery.eq('location_id', locationId);
    }

    // Execute all queries in parallel
    const [
      { data: reviews, error: reviewsError },
      { data: analytics, error: analyticsError },
      { data: posts, error: postsError },
      { data: media, error: mediaError },
      { data: locations, error: locationsError },
    ] = await Promise.all([
      reviewsQuery,
      analyticsQuery,
      postsQuery,
      mediaQuery,
      locationsQuery,
    ]);

    // Check for errors
    if (reviewsError) console.error('[API] Reviews error:', reviewsError);
    if (analyticsError) console.error('[API] Analytics error:', analyticsError);
    if (postsError) console.error('[API] Posts error:', postsError);
    if (mediaError) console.error('[API] Media error:', mediaError);
    if (locationsError) console.error('[API] Locations error:', locationsError);

    // Calculate stats
    const reviewList = reviews || [];
    const analyticsList = analytics || [];
    const postList = posts || [];
    const mediaList = media || [];

    // Calculate average rating
    const ratingsWithValue = reviewList.filter(r => r.star_rating !== null);
    const avgRating = ratingsWithValue.length > 0
      ? ratingsWithValue.reduce((sum, r) => sum + (r.star_rating || 0), 0) / ratingsWithValue.length
      : 0;

    // Get latest analytics snapshot for top keywords
    const latestAnalytics = analyticsList[0];
    let topKeywords: { keyword: string; impressions: number }[] = [];
    let totalImpressions = 0;
    let totalKeywords = 0;

    if (latestAnalytics) {
      const keywordsData = typeof latestAnalytics.keywords === 'string'
        ? JSON.parse(latestAnalytics.keywords)
        : latestAnalytics.keywords || [];

      topKeywords = keywordsData
        .slice(0, 10)
        .map((k: any) => ({ keyword: k.keyword, impressions: k.impressions }));

      totalImpressions = latestAnalytics.total_impressions || 0;
      totalKeywords = latestAnalytics.total_keywords || 0;
    }

    // Find last sync date
    const allDates = [
      ...reviewList.map(r => r.fetched_at),
      ...analyticsList.map(a => a.fetched_at),
      ...postList.map(p => p.fetched_at),
      ...mediaList.map(m => m.fetched_at),
    ].filter(Boolean);

    const lastSyncDate = allDates.length > 0
      ? allDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
      : null;

    const stats: GBPStats = {
      totalReviews: reviewList.length,
      averageRating: Math.round(avgRating * 10) / 10,
      fiveStarCount: reviewList.filter(r => r.star_rating === 5).length,
      oneStarCount: reviewList.filter(r => r.star_rating === 1).length,
      repliedCount: reviewList.filter(r => r.reply_comment).length,
      totalPosts: postList.length,
      totalMedia: mediaList.length,
      totalImpressions,
      totalKeywords,
      topKeywords,
      lastSyncDate,
    };

    console.log(`[API] Successfully fetched GBP data: ${reviewList.length} reviews, ${analyticsList.length} analytics, ${postList.length} posts, ${mediaList.length} media, ${(locations || []).length} locations`);

    return NextResponse.json({
      success: true,
      data: {
        reviews: reviewList,
        analytics: analyticsList,
        posts: postList,
        media: mediaList,
        locations: locations || [],
      },
      stats,
      locationId: locationId || undefined,
    });

  } catch (error: any) {
    console.error('[API /api/supabase/gbp] Error:', error);
    return NextResponse.json(
      {
        success: false,
        data: {
          reviews: [],
          analytics: [],
          posts: [],
          media: [],
          locations: [],
        },
        stats: {
          totalReviews: 0,
          averageRating: 0,
          fiveStarCount: 0,
          oneStarCount: 0,
          repliedCount: 0,
          totalPosts: 0,
          totalMedia: 0,
          totalImpressions: 0,
          totalKeywords: 0,
          topKeywords: [],
          lastSyncDate: null,
        },
        message: error.message || 'Failed to fetch GBP data',
      },
      { status: 500 }
    );
  }
}
