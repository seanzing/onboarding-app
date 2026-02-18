-- Add hubspot_company_id to contacts table
-- Purpose: Link contacts to HubSpot companies for unified data access
-- Idempotent: Can be run multiple times safely

-- Add hubspot_company_id column to contacts table if it doesn't exist
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS hubspot_company_id TEXT;

-- Create index for fast lookups by hubspot_company_id
CREATE INDEX IF NOT EXISTS idx_contacts_hubspot_company_id
  ON public.contacts(hubspot_company_id);
