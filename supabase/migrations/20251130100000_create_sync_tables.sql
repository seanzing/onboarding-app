-- ============================================================================
-- Migration: Create Sync Tables for GBP and BrightLocal Data Persistence
-- Created: 2025-11-30
-- Purpose: Store data that was previously fetched live but not persisted
-- ============================================================================

-- ============================================================================
-- 1. GBP REVIEWS TABLE
-- Stores Google Business Profile reviews with full history
-- ============================================================================
CREATE TABLE IF NOT EXISTS gbp_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Location identification
  account_id TEXT NOT NULL,
  location_id TEXT NOT NULL,

  -- Review identification (Google's unique ID)
  review_id TEXT NOT NULL,

  -- Review content
  reviewer_display_name TEXT,
  reviewer_profile_photo_url TEXT,
  star_rating INTEGER CHECK (star_rating >= 1 AND star_rating <= 5),
  comment TEXT,

  -- Reply information
  reply_comment TEXT,
  reply_update_time TIMESTAMPTZ,

  -- Timestamps
  create_time TIMESTAMPTZ,        -- When review was posted
  update_time TIMESTAMPTZ,        -- When review was last modified
  fetched_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate reviews
  UNIQUE(location_id, review_id)
);

-- Index for fast lookups by location
CREATE INDEX IF NOT EXISTS idx_gbp_reviews_location ON gbp_reviews(location_id);
CREATE INDEX IF NOT EXISTS idx_gbp_reviews_rating ON gbp_reviews(star_rating);
CREATE INDEX IF NOT EXISTS idx_gbp_reviews_create_time ON gbp_reviews(create_time DESC);

COMMENT ON TABLE gbp_reviews IS 'Google Business Profile reviews synced daily';

-- ============================================================================
-- 2. GBP ANALYTICS SNAPSHOTS TABLE
-- Stores daily keyword impressions and performance metrics
-- ============================================================================
CREATE TABLE IF NOT EXISTS gbp_analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Location identification
  location_id TEXT NOT NULL,

  -- Snapshot date (one record per location per day)
  snapshot_date DATE NOT NULL,

  -- Date range this snapshot covers
  date_range_start DATE,
  date_range_end DATE,

  -- Aggregated metrics
  total_impressions INTEGER DEFAULT 0,
  total_keywords INTEGER DEFAULT 0,

  -- Full keyword data as JSONB array
  -- Format: [{"keyword": "...", "impressions": 123}, ...]
  keywords JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  fetched_at TIMESTAMPTZ DEFAULT NOW(),

  -- One snapshot per location per day
  UNIQUE(location_id, snapshot_date)
);

-- Index for time-series queries
CREATE INDEX IF NOT EXISTS idx_gbp_analytics_location_date ON gbp_analytics_snapshots(location_id, snapshot_date DESC);

COMMENT ON TABLE gbp_analytics_snapshots IS 'Daily GBP search keyword performance snapshots';

-- ============================================================================
-- 3. GBP POSTS TABLE
-- Stores Google Business Profile posts
-- ============================================================================
CREATE TABLE IF NOT EXISTS gbp_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Location identification
  account_id TEXT NOT NULL,
  location_id TEXT NOT NULL,

  -- Post identification (Google's resource name)
  post_name TEXT NOT NULL,

  -- Post content
  summary TEXT,
  language_code TEXT,

  -- Post type (STANDARD, EVENT, OFFER, ALERT)
  topic_type TEXT,

  -- Call to action
  call_to_action_type TEXT,
  call_to_action_url TEXT,

  -- Event details (if applicable)
  event_title TEXT,
  event_start_date DATE,
  event_end_date DATE,

  -- Offer details (if applicable)
  offer_coupon_code TEXT,
  offer_redeem_online_url TEXT,
  offer_terms_conditions TEXT,

  -- Media (first media item URL)
  media_url TEXT,
  media_format TEXT,  -- PHOTO or VIDEO

  -- State
  state TEXT,  -- LIVE, REJECTED, etc.

  -- Timestamps
  create_time TIMESTAMPTZ,
  update_time TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicates
  UNIQUE(location_id, post_name)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_gbp_posts_location ON gbp_posts(location_id);
CREATE INDEX IF NOT EXISTS idx_gbp_posts_create_time ON gbp_posts(create_time DESC);

COMMENT ON TABLE gbp_posts IS 'Google Business Profile posts synced daily';

-- ============================================================================
-- 4. GBP MEDIA TABLE
-- Stores Google Business Profile photos and videos
-- ============================================================================
CREATE TABLE IF NOT EXISTS gbp_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Location identification
  account_id TEXT NOT NULL,
  location_id TEXT NOT NULL,

  -- Media identification (Google's resource name)
  media_name TEXT NOT NULL,

  -- Media details
  media_format TEXT,  -- PHOTO or VIDEO
  location_association TEXT,  -- CATEGORY, PROFILE, etc.

  -- URLs
  google_url TEXT,  -- Google-hosted URL
  thumbnail_url TEXT,
  source_url TEXT,  -- Original source if available

  -- Dimensions
  width_pixels INTEGER,
  height_pixels INTEGER,

  -- Attribution
  attribution_profile_name TEXT,
  attribution_profile_url TEXT,

  -- Insights
  view_count BIGINT DEFAULT 0,

  -- Timestamps
  create_time TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicates
  UNIQUE(location_id, media_name)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_gbp_media_location ON gbp_media(location_id);

COMMENT ON TABLE gbp_media IS 'Google Business Profile photos and videos synced weekly';

-- ============================================================================
-- 5. GBP LOCATIONS SYNC TABLE
-- Master table for synced GBP location data
-- Links to hubspot_contact_id for cross-referencing
-- ============================================================================
CREATE TABLE IF NOT EXISTS gbp_locations_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Google identifiers
  account_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  location_name TEXT,  -- Google's resource name

  -- Cross-reference to HubSpot (universal identifier)
  hubspot_contact_id TEXT,

  -- Business information
  title TEXT,  -- Business name as shown on Google
  store_code TEXT,

  -- Address
  address_lines TEXT[],
  locality TEXT,  -- City
  administrative_area TEXT,  -- State
  postal_code TEXT,
  country_code TEXT,

  -- Contact
  primary_phone TEXT,
  website_uri TEXT,

  -- Categories
  primary_category_id TEXT,
  primary_category_name TEXT,
  additional_categories JSONB DEFAULT '[]'::jsonb,

  -- Status
  verification_state TEXT,  -- VERIFIED, UNVERIFIED, etc.
  is_open BOOLEAN DEFAULT true,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  create_time TIMESTAMPTZ,
  update_time TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),

  -- One record per location
  UNIQUE(account_id, location_id)
);

-- Index for cross-referencing
CREATE INDEX IF NOT EXISTS idx_gbp_locations_sync_hubspot ON gbp_locations_sync(hubspot_contact_id);
CREATE INDEX IF NOT EXISTS idx_gbp_locations_sync_account ON gbp_locations_sync(account_id);

COMMENT ON TABLE gbp_locations_sync IS 'Google Business Profile locations synced weekly';

-- ============================================================================
-- 6. SYNC JOBS LOG TABLE
-- Tracks all sync operations for monitoring and debugging
-- ============================================================================
CREATE TABLE IF NOT EXISTS sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Job identification
  job_type TEXT NOT NULL,  -- 'gbp_reviews', 'gbp_analytics', 'brightlocal_locations', etc.

  -- Status
  status TEXT NOT NULL DEFAULT 'running',  -- 'running', 'completed', 'failed'

  -- Results
  records_fetched INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,

  -- Error details (if any)
  error_message TEXT,
  error_details JSONB,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for monitoring
CREATE INDEX IF NOT EXISTS idx_sync_jobs_type_status ON sync_jobs(job_type, status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_started ON sync_jobs(started_at DESC);

COMMENT ON TABLE sync_jobs IS 'Log of all data sync operations';

-- ============================================================================
-- 7. ADD SYNC TRACKING TO EXISTING BRIGHTLOCAL TABLES
-- ============================================================================

-- Add last_synced_at to brightlocal_locations if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brightlocal_locations' AND column_name = 'last_synced_at'
  ) THEN
    ALTER TABLE brightlocal_locations ADD COLUMN last_synced_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add last_synced_at to brightlocal_campaigns if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brightlocal_campaigns' AND column_name = 'last_synced_at'
  ) THEN
    ALTER TABLE brightlocal_campaigns ADD COLUMN last_synced_at TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================================================
-- 8. CREATE HELPER VIEWS FOR DASHBOARDS
-- ============================================================================

-- View: Latest reviews per location with stats
CREATE OR REPLACE VIEW v_gbp_review_stats AS
SELECT
  location_id,
  COUNT(*) as total_reviews,
  ROUND(AVG(star_rating), 2) as avg_rating,
  COUNT(*) FILTER (WHERE star_rating = 5) as five_star_count,
  COUNT(*) FILTER (WHERE star_rating = 1) as one_star_count,
  COUNT(*) FILTER (WHERE reply_comment IS NOT NULL) as replied_count,
  MAX(create_time) as latest_review_date,
  MAX(fetched_at) as last_synced
FROM gbp_reviews
GROUP BY location_id;

COMMENT ON VIEW v_gbp_review_stats IS 'Aggregated review statistics per GBP location';

-- View: Latest analytics per location
CREATE OR REPLACE VIEW v_gbp_latest_analytics AS
SELECT DISTINCT ON (location_id)
  location_id,
  snapshot_date,
  total_impressions,
  total_keywords,
  keywords,
  fetched_at
FROM gbp_analytics_snapshots
ORDER BY location_id, snapshot_date DESC;

COMMENT ON VIEW v_gbp_latest_analytics IS 'Most recent analytics snapshot per location';

-- View: Sync job history summary
CREATE OR REPLACE VIEW v_sync_status AS
SELECT
  job_type,
  status,
  COUNT(*) as job_count,
  MAX(started_at) as last_run,
  AVG(duration_ms) as avg_duration_ms,
  SUM(records_created) as total_created,
  SUM(records_updated) as total_updated,
  SUM(errors) as total_errors
FROM sync_jobs
WHERE started_at > NOW() - INTERVAL '7 days'
GROUP BY job_type, status
ORDER BY job_type, last_run DESC;

COMMENT ON VIEW v_sync_status IS 'Sync job status summary for last 7 days';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
