-- Add dealname column to contacts table
-- Stores the HubSpot deal name associated with each contact
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS dealname TEXT;
