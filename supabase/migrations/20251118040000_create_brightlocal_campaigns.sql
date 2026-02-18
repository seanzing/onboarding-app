/**
 * Create BrightLocal Campaigns Table
 *
 * Purpose: Store BrightLocal campaign/citation data with HubSpot company linkage
 * Idempotent: Can be run multiple times safely
 */

-- Create brightlocal_campaigns table
CREATE TABLE IF NOT EXISTS public.brightlocal_campaigns (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- BrightLocal identifiers
  brightlocal_campaign_id TEXT UNIQUE NOT NULL,
  brightlocal_location_id TEXT,

  -- HubSpot linkage (CRITICAL - universal identifier)
  hubspot_company_id TEXT NOT NULL,

  -- Campaign details
  campaign_name TEXT,
  campaign_type TEXT, -- citation, review_generation, listing_sync, etc.
  campaign_status TEXT, -- active, paused, completed, cancelled

  -- Campaign dates
  start_date DATE,
  end_date DATE,
  last_run_date TIMESTAMPTZ,

  -- Citation/Listing metrics
  citations_built INTEGER DEFAULT 0,
  citations_pending INTEGER DEFAULT 0,
  citations_live INTEGER DEFAULT 0,
  citations_failed INTEGER DEFAULT 0,
  total_directories INTEGER DEFAULT 0,

  -- Review metrics (if applicable)
  review_count INTEGER DEFAULT 0,
  average_rating DECIMAL(3, 2),
  total_reviews_generated INTEGER DEFAULT 0,

  -- Listing sync metrics (if applicable)
  listings_synced INTEGER DEFAULT 0,
  listings_pending INTEGER DEFAULT 0,
  listings_failed INTEGER DEFAULT 0,

  -- Campaign configuration (stored as JSONB for flexibility)
  campaign_config JSONB DEFAULT '{}'::jsonb,

  -- Results and reporting
  last_report_generated_at TIMESTAMPTZ,
  report_summary JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  last_sync_status TEXT,

  -- Foreign key to brightlocal_locations
  location_id UUID REFERENCES public.brightlocal_locations(id) ON DELETE SET NULL,

  -- Foreign key to clients table (optional but recommended)
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,

  -- Additional metadata as JSONB for flexibility
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for HubSpot company ID lookups (CRITICAL for performance)
CREATE INDEX IF NOT EXISTS idx_brightlocal_campaigns_hubspot_id
  ON public.brightlocal_campaigns(hubspot_company_id);

-- Create index for BrightLocal campaign ID lookups
CREATE INDEX IF NOT EXISTS idx_brightlocal_campaigns_bl_id
  ON public.brightlocal_campaigns(brightlocal_campaign_id);

-- Create index for BrightLocal location ID lookups
CREATE INDEX IF NOT EXISTS idx_brightlocal_campaigns_bl_location_id
  ON public.brightlocal_campaigns(brightlocal_location_id);

-- Create index for location_id foreign key lookups
CREATE INDEX IF NOT EXISTS idx_brightlocal_campaigns_location_id
  ON public.brightlocal_campaigns(location_id);

-- Create index for client_id foreign key lookups
CREATE INDEX IF NOT EXISTS idx_brightlocal_campaigns_client_id
  ON public.brightlocal_campaigns(client_id);

-- Create index for campaign status
CREATE INDEX IF NOT EXISTS idx_brightlocal_campaigns_status
  ON public.brightlocal_campaigns(campaign_status);

-- Create index for sync status
CREATE INDEX IF NOT EXISTS idx_brightlocal_campaigns_synced_at
  ON public.brightlocal_campaigns(synced_at);

-- Add comment to table
COMMENT ON TABLE public.brightlocal_campaigns IS
  'BrightLocal campaign/citation data linked to HubSpot companies via hubspot_company_id';

-- Add comment to critical column
COMMENT ON COLUMN public.brightlocal_campaigns.hubspot_company_id IS
  'HubSpot company ID (hs_object_id) - Universal identifier linking all integrations';
