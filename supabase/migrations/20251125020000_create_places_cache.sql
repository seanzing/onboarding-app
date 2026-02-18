/**
 * Create Places API Cache Tables
 *
 * Purpose: Cache Google Places search results to reduce API costs (~$9K/year savings)
 * TTL: 30 days for searches, 90 days for place details
 * Idempotent: Can be run multiple times safely
 */

-- Cache Google Places text search results (30 days TTL)
CREATE TABLE IF NOT EXISTS public.places_search_cache (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cache key - hash of query + location params
  query_hash TEXT UNIQUE NOT NULL,

  -- Original query parameters (for debugging)
  query TEXT NOT NULL,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  search_type TEXT, -- 'accounting_firm', 'restaurant', etc.

  -- Cached results as JSONB
  results JSONB NOT NULL,
  result_count INTEGER,

  -- Cache metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  access_count INTEGER DEFAULT 1,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cache lookups
CREATE INDEX IF NOT EXISTS idx_places_search_cache_hash
  ON public.places_search_cache(query_hash);

-- Index for TTL cleanup
CREATE INDEX IF NOT EXISTS idx_places_search_cache_expires
  ON public.places_search_cache(expires_at);

-- Index for analytics (most accessed searches)
CREATE INDEX IF NOT EXISTS idx_places_search_cache_access
  ON public.places_search_cache(access_count DESC);

-- Add comments
COMMENT ON TABLE public.places_search_cache IS
  'Cache for Google Places API text search results (30-day TTL)';

COMMENT ON COLUMN public.places_search_cache.query_hash IS
  'SHA-256 hash of query + location params for unique cache key';

-- Cache individual place details (90 days TTL)
CREATE TABLE IF NOT EXISTS public.places_details_cache (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Google Place ID (unique identifier)
  place_id TEXT UNIQUE NOT NULL,

  -- Cached place details as JSONB
  details JSONB NOT NULL,

  -- Key fields extracted for quick access
  name TEXT,
  formatted_address TEXT,
  rating DECIMAL(2, 1),
  total_reviews INTEGER,
  phone TEXT,
  website TEXT,

  -- Cache metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'),
  access_count INTEGER DEFAULT 1,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for place lookups
CREATE INDEX IF NOT EXISTS idx_places_details_cache_place_id
  ON public.places_details_cache(place_id);

-- Index for TTL cleanup
CREATE INDEX IF NOT EXISTS idx_places_details_cache_expires
  ON public.places_details_cache(expires_at);

-- Add comment
COMMENT ON TABLE public.places_details_cache IS
  'Cache for Google Places API place details (90-day TTL)';

-- Function to clean up expired cache entries (can be called by cron)
CREATE OR REPLACE FUNCTION cleanup_places_cache()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete expired search results
  DELETE FROM public.places_search_cache
  WHERE expires_at < NOW();

  -- Delete expired place details
  DELETE FROM public.places_details_cache
  WHERE expires_at < NOW();
END;
$$;

COMMENT ON FUNCTION cleanup_places_cache() IS
  'Removes expired entries from Places cache tables. Call via cron or API.';
