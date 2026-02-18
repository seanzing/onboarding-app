/**
 * Fix BrightLocal Locations Table Schema
 *
 * Drops and recreates table with correct column names
 */

-- Drop existing table
DROP TABLE IF EXISTS public.brightlocal_locations CASCADE;

-- Create table with correct schema
CREATE TABLE public.brightlocal_locations (
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
  business_categories TEXT[],
  primary_category TEXT,

  -- Location coordinates
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Status and verification
  location_status TEXT,
  verification_status TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  last_sync_status TEXT,

  -- Foreign key to clients table
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,

  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX idx_brightlocal_locations_hubspot_id
  ON public.brightlocal_locations(hubspot_company_id);

CREATE INDEX idx_brightlocal_locations_bl_id
  ON public.brightlocal_locations(brightlocal_location_id);

CREATE INDEX idx_brightlocal_locations_client_id
  ON public.brightlocal_locations(client_id);

CREATE INDEX idx_brightlocal_locations_synced_at
  ON public.brightlocal_locations(synced_at);

-- Add table comment
COMMENT ON TABLE public.brightlocal_locations IS
  'BrightLocal location data linked to HubSpot companies via hubspot_company_id';

-- Add column comment
COMMENT ON COLUMN public.brightlocal_locations.hubspot_company_id IS
  'HubSpot company ID (hs_object_id) - Universal identifier linking all integrations';
