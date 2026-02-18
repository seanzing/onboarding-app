/**
 * Create GBP Reviews Cache Table
 *
 * Purpose: Cache Google Business Profile reviews to reduce API calls
 * TTL: 15 minutes (reviews change more frequently than places data)
 * Idempotent: Can be run multiple times safely
 */

-- Cache GBP reviews by location (15 minutes TTL)
CREATE TABLE IF NOT EXISTS public.gbp_reviews_cache (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Location identifier (composite key for cache lookup)
  account_id TEXT NOT NULL,
  location_id TEXT NOT NULL,

  -- Cache key - combination of account_id + location_id
  cache_key TEXT UNIQUE NOT NULL,

  -- Cached reviews data as JSONB
  reviews JSONB NOT NULL,
  total_review_count INTEGER,
  average_rating DECIMAL(2, 1),
  next_page_token TEXT,

  -- Cache metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '15 minutes'),
  access_count INTEGER DEFAULT 1,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cache lookups
CREATE INDEX IF NOT EXISTS idx_gbp_reviews_cache_key
  ON public.gbp_reviews_cache(cache_key);

-- Index for location lookups
CREATE INDEX IF NOT EXISTS idx_gbp_reviews_cache_location
  ON public.gbp_reviews_cache(account_id, location_id);

-- Index for TTL cleanup
CREATE INDEX IF NOT EXISTS idx_gbp_reviews_cache_expires
  ON public.gbp_reviews_cache(expires_at);

-- Add comments
COMMENT ON TABLE public.gbp_reviews_cache IS
  'Cache for Google Business Profile reviews (15-minute TTL)';

COMMENT ON COLUMN public.gbp_reviews_cache.cache_key IS
  'Combination of account_id:location_id for unique cache key';

-- Individual reviews table for more granular access
CREATE TABLE IF NOT EXISTS public.gbp_reviews_individual (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Review identifier from Google
  review_name TEXT UNIQUE NOT NULL, -- e.g., 'accounts/xxx/locations/xxx/reviews/xxx'

  -- Location association
  account_id TEXT NOT NULL,
  location_id TEXT NOT NULL,

  -- Review details
  reviewer_name TEXT,
  reviewer_photo_url TEXT,
  star_rating INTEGER CHECK (star_rating BETWEEN 1 AND 5),
  comment TEXT,
  review_reply TEXT,
  review_reply_time TIMESTAMPTZ,
  create_time TIMESTAMPTZ,
  update_time TIMESTAMPTZ,

  -- Full review data as JSONB (for fields we haven't extracted)
  raw_data JSONB,

  -- Cache metadata
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for review lookups
CREATE INDEX IF NOT EXISTS idx_gbp_reviews_individual_name
  ON public.gbp_reviews_individual(review_name);

-- Index for location lookups
CREATE INDEX IF NOT EXISTS idx_gbp_reviews_individual_location
  ON public.gbp_reviews_individual(account_id, location_id);

-- Index for star rating queries (e.g., show all 1-star reviews)
CREATE INDEX IF NOT EXISTS idx_gbp_reviews_individual_rating
  ON public.gbp_reviews_individual(star_rating);

-- Add comment
COMMENT ON TABLE public.gbp_reviews_individual IS
  'Individual GBP reviews synced from Google (for historical tracking)';

-- Function to clean up expired review cache
CREATE OR REPLACE FUNCTION cleanup_gbp_reviews_cache()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.gbp_reviews_cache
  WHERE expires_at < NOW();
END;
$$;

COMMENT ON FUNCTION cleanup_gbp_reviews_cache() IS
  'Removes expired entries from GBP reviews cache.';
