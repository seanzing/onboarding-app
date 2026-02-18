/**
 * Create Google Business Profile Locations Table
 *
 * Purpose: Store GBP location data with HubSpot company linkage
 * Note: Different from BrightLocal locations - these are actual GBP listings
 * Idempotent: Can be run multiple times safely
 */

-- Create gbp_locations table
CREATE TABLE IF NOT EXISTS public.gbp_locations (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Google/GBP identifiers
  google_location_id TEXT UNIQUE NOT NULL, -- Google's location ID (from GBP API)
  google_account_id TEXT, -- Google account that owns this location
  place_id TEXT, -- Google Place ID (if available)

  -- HubSpot linkage (CRITICAL - universal identifier)
  hubspot_company_id TEXT NOT NULL,

  -- Location details
  store_name TEXT NOT NULL,
  store_code TEXT, -- Internal reference/code

  -- Address
  address_line_1 TEXT,
  address_line_2 TEXT,
  locality TEXT, -- City/town
  administrative_area TEXT, -- State/province
  postal_code TEXT,
  country_code TEXT, -- ISO country code (US, CA, etc.)

  -- Contact information
  primary_phone TEXT,
  additional_phones TEXT[], -- Array for multiple phone numbers
  website_url TEXT,

  -- Business details
  primary_category TEXT,
  additional_categories TEXT[], -- Array of category strings
  description TEXT,

  -- Location coordinates
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Hours of operation (stored as JSONB)
  regular_hours JSONB DEFAULT '{}'::jsonb, -- {monday: {open: "09:00", close: "17:00"}, ...}
  special_hours JSONB DEFAULT '[]'::jsonb, -- Array of special hour periods

  -- Status and verification
  location_status TEXT, -- OPEN, CLOSED_TEMPORARILY, CLOSED_PERMANENTLY
  verification_status TEXT, -- VERIFIED, UNVERIFIED, PENDING
  is_published BOOLEAN DEFAULT false,
  is_disabled BOOLEAN DEFAULT false,

  -- Profile attributes
  attributes JSONB DEFAULT '{}'::jsonb, -- GBP attributes (wheelchair_accessible, etc.)

  -- Media
  profile_photo_url TEXT,
  cover_photo_url TEXT,
  logo_url TEXT,
  additional_media_urls TEXT[], -- Array of additional photo URLs

  -- Review/rating data
  average_rating DECIMAL(3, 2),
  total_review_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_modified_by_google_at TIMESTAMPTZ, -- When Google last modified this location

  -- Foreign keys
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  pipedream_account_id UUID REFERENCES public.pipedream_connected_accounts(id) ON DELETE SET NULL,

  -- Additional metadata as JSONB for flexibility
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for HubSpot company ID lookups (CRITICAL for performance)
CREATE INDEX IF NOT EXISTS idx_gbp_locations_hubspot_id
  ON public.gbp_locations(hubspot_company_id);

-- Create index for Google location ID lookups
CREATE INDEX IF NOT EXISTS idx_gbp_locations_google_id
  ON public.gbp_locations(google_location_id);

-- Create index for Google account ID lookups
CREATE INDEX IF NOT EXISTS idx_gbp_locations_google_account_id
  ON public.gbp_locations(google_account_id);

-- Create index for place ID lookups
CREATE INDEX IF NOT EXISTS idx_gbp_locations_place_id
  ON public.gbp_locations(place_id);

-- Create index for client_id foreign key lookups
CREATE INDEX IF NOT EXISTS idx_gbp_locations_client_id
  ON public.gbp_locations(client_id);

-- Create index for pipedream_account_id foreign key lookups
CREATE INDEX IF NOT EXISTS idx_gbp_locations_pipedream_account_id
  ON public.gbp_locations(pipedream_account_id);

-- Create index for verification status
CREATE INDEX IF NOT EXISTS idx_gbp_locations_verification_status
  ON public.gbp_locations(verification_status);

-- Create index for location status
CREATE INDEX IF NOT EXISTS idx_gbp_locations_status
  ON public.gbp_locations(location_status);

-- Create index for sync status
CREATE INDEX IF NOT EXISTS idx_gbp_locations_synced_at
  ON public.gbp_locations(synced_at);

-- Add comment to table
COMMENT ON TABLE public.gbp_locations IS
  'Google Business Profile location data linked to HubSpot companies via hubspot_company_id';

-- Add comment to critical column
COMMENT ON COLUMN public.gbp_locations.hubspot_company_id IS
  'HubSpot company ID (hs_object_id) - Universal identifier linking all integrations';

-- Add comment to google_account_id
COMMENT ON COLUMN public.gbp_locations.google_account_id IS
  'Google account ID from Pipedream connected account - links to pipedream_connected_accounts table';
