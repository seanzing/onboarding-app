/**
 * Create BrightLocal Locations Table
 *
 * Purpose: Store BrightLocal location data with HubSpot company linkage
 * Idempotent: Can be run multiple times safely
 */

-- Create brightlocal_locations table
CREATE TABLE IF NOT EXISTS public.brightlocal_locations (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- BrightLocal identifiers
  brightlocal_location_id TEXT UNIQUE NOT NULL,
  brightlocal_client_id TEXT,

  -- HubSpot linkage (CRITICAL - universal identifier)
  hubspot_company_id TEXT NOT NULL,

  -- Location details
  business_name TEXT,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state_province TEXT,
  postal_code TEXT,
  country TEXT,
  phone TEXT,
  website_url TEXT,

  -- Business category/type
  business_categories TEXT[], -- Array of category strings
  primary_category TEXT,

  -- Location coordinates
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Status and verification
  location_status TEXT, -- active, inactive, pending, etc.
  verification_status TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  last_sync_status TEXT,

  -- Foreign key to clients table (optional but recommended)
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,

  -- Additional metadata as JSONB for flexibility
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for HubSpot company ID lookups (CRITICAL for performance)
CREATE INDEX IF NOT EXISTS idx_brightlocal_locations_hubspot_id
  ON public.brightlocal_locations(hubspot_company_id);

-- Create index for BrightLocal location ID lookups
CREATE INDEX IF NOT EXISTS idx_brightlocal_locations_bl_id
  ON public.brightlocal_locations(brightlocal_location_id);

-- Create index for client_id foreign key lookups
CREATE INDEX IF NOT EXISTS idx_brightlocal_locations_client_id
  ON public.brightlocal_locations(client_id);

-- Create index for sync status
CREATE INDEX IF NOT EXISTS idx_brightlocal_locations_synced_at
  ON public.brightlocal_locations(synced_at);

-- Add comment to table
COMMENT ON TABLE public.brightlocal_locations IS
  'BrightLocal location data linked to HubSpot companies via hubspot_company_id';

-- Add comment to critical column
COMMENT ON COLUMN public.brightlocal_locations.hubspot_company_id IS
  'HubSpot company ID (hs_object_id) - Universal identifier linking all integrations';
