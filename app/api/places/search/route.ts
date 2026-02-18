/**
 * Public Business Lookup API with Caching
 *
 * Look up any business on Google Maps without OAuth.
 * Results are cached for 30 days to reduce API costs (~$9K/year savings).
 *
 * GET /api/places/search?q=business+name+city
 * GET /api/places/search?q=accounting+firms&lat=45.5&lng=-122.6
 * GET /api/places/search?q=restaurants&nocache=true (skip cache)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { PlacesClient } from '@/lib/places/client';

// Generate cache key from search parameters
function generateCacheKey(query: string, lat?: string | null, lng?: string | null, type?: string | null): string {
  const keyData = JSON.stringify({ query: query.toLowerCase().trim(), lat, lng, type });
  return createHash('sha256').update(keyData).digest('hex');
}

// Transform place to clean format
function transformPlace(place: Record<string, unknown>) {
  return {
    placeId: place.id,
    name: (place.displayName as { text?: string })?.text,
    address: place.formattedAddress,
    location: place.location,
    rating: place.rating,
    totalReviews: place.userRatingCount,
    phone: place.nationalPhoneNumber || place.internationalPhoneNumber,
    website: place.websiteUri,
    businessStatus: place.businessStatus,
    category: (place.primaryTypeDisplayName as { text?: string })?.text || place.primaryType,
    types: place.types,
    priceLevel: place.priceLevel,
    googleMapsUrl: place.googleMapsUri,
    hours: (place.regularOpeningHours as { weekdayDescriptions?: string[] })?.weekdayDescriptions,
    isOpenNow: (place.regularOpeningHours as { openNow?: boolean })?.openNow,
  };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skipCache = searchParams.get('nocache') === 'true';

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    // Generate cache key
    const cacheKey = generateCacheKey(query, lat, lng, type);
    console.log(`[API Places] Search: "${query}" (cache key: ${cacheKey.substring(0, 8)}...)`);

    // Initialize Supabase client for caching
    // Using 'any' for database type since cache tables are new and not in generated types
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let supabase: ReturnType<typeof createClient<any>> | null = null;

    if (supabaseUrl && supabaseServiceKey) {
      supabase = createClient(supabaseUrl, supabaseServiceKey);
    }

    // Check cache first (unless skipCache is true)
    if (!skipCache && supabase) {
      try {
        const { data: cached, error: cacheError } = await supabase
          .from('places_search_cache')
          .select('*')
          .eq('query_hash', cacheKey)
          .gte('expires_at', new Date().toISOString())
          .single();

        if (cached && !cacheError) {
          console.log(`[API Places] ✅ Cache HIT (${Date.now() - startTime}ms)`);

          // Update access count (fire-and-forget)
          void supabase
            .from('places_search_cache')
            .update({
              access_count: cached.access_count + 1,
              last_accessed_at: new Date().toISOString(),
            })
            .eq('id', cached.id);

          return NextResponse.json({
            success: true,
            query,
            count: cached.result_count,
            businesses: cached.results,
            cached: true,
            cacheAge: Math.round((Date.now() - new Date(cached.created_at).getTime()) / 1000 / 60), // minutes
          });
        }
      } catch {
        // Cache miss or error, continue to API
        console.log('[API Places] Cache miss or error, fetching from Google');
      }
    }

    // Cache miss - call Google Places API
    console.log('[API Places] Fetching from Google Places API...');
    const client = new PlacesClient();

    const results = await client.textSearch(query, {
      maxResultCount: Math.min(limit, 20),
      locationBias: lat && lng ? {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        radius: 50000, // 50km
      } : undefined,
      includedType: type || undefined,
    });

    // Transform to a cleaner format
    const businesses = results.map(place => transformPlace(place as unknown as Record<string, unknown>));

    // Store in cache (fire-and-forget)
    if (supabase && businesses.length > 0) {
      supabase
        .from('places_search_cache')
        .upsert(
          {
            query_hash: cacheKey,
            query: query,
            location_lat: lat ? parseFloat(lat) : null,
            location_lng: lng ? parseFloat(lng) : null,
            search_type: type || null,
            results: businesses,
            result_count: businesses.length,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
            access_count: 1,
            last_accessed_at: new Date().toISOString(),
          },
          { onConflict: 'query_hash' }
        )
        .then(() => console.log('[API Places] Cached results for future requests'));
    }

    console.log(`[API Places] ✅ API response (${Date.now() - startTime}ms, ${businesses.length} results)`);

    return NextResponse.json({
      success: true,
      query,
      count: businesses.length,
      businesses,
      cached: false,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API Places] Search error:', message);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
