-- ============================================================================
-- Migration: Fix Missing hubspot_company_id Columns
-- ============================================================================
--
-- Purpose: Add hubspot_company_id to all tables that are missing it
--          This is a corrective migration to ensure Universal HubSpot ID Strategy
--          is implemented across ALL integration tables.
--
-- Tables Fixed:
--   - clients (core table - links to HubSpot companies)
--   - contacts (core table - links contacts to companies)
--   - brightlocal_campaigns (integration table)
--   - pipedream_connected_accounts (OAuth table)
--
-- Author: Claude Code
-- Date: 2025-11-25
-- Idempotent: YES - Safe to run multiple times
--
-- ============================================================================

-- ============================================================================
-- STEP 1: Add hubspot_company_id to clients table
-- ============================================================================

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS hubspot_company_id TEXT;

CREATE INDEX IF NOT EXISTS idx_clients_hubspot_company_id
ON clients(hubspot_company_id);

COMMENT ON COLUMN clients.hubspot_company_id IS
  'HubSpot company ID (hs_object_id) - Universal identifier for cross-integration linking';

-- ============================================================================
-- STEP 2: Add hubspot_company_id to contacts table
-- ============================================================================

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS hubspot_company_id TEXT;

CREATE INDEX IF NOT EXISTS idx_contacts_hubspot_company_id
ON contacts(hubspot_company_id);

COMMENT ON COLUMN contacts.hubspot_company_id IS
  'HubSpot company ID (hs_object_id) - Links contact to their associated company';

-- ============================================================================
-- STEP 3: Add hubspot_company_id to brightlocal_campaigns table
-- ============================================================================

ALTER TABLE brightlocal_campaigns
ADD COLUMN IF NOT EXISTS hubspot_company_id TEXT;

CREATE INDEX IF NOT EXISTS idx_brightlocal_campaigns_hubspot_company_id
ON brightlocal_campaigns(hubspot_company_id);

COMMENT ON COLUMN brightlocal_campaigns.hubspot_company_id IS
  'HubSpot company ID (hs_object_id) - Links campaign to HubSpot company';

-- ============================================================================
-- STEP 4: Add hubspot_company_id to pipedream_connected_accounts table
-- ============================================================================

ALTER TABLE pipedream_connected_accounts
ADD COLUMN IF NOT EXISTS hubspot_company_id TEXT;

CREATE INDEX IF NOT EXISTS idx_pipedream_connected_accounts_hubspot_company_id
ON pipedream_connected_accounts(hubspot_company_id);

COMMENT ON COLUMN pipedream_connected_accounts.hubspot_company_id IS
  'HubSpot company ID (hs_object_id) - Links OAuth connection to company';

-- ============================================================================
-- STEP 5: Verification
-- ============================================================================

DO $$
DECLARE
  clients_total INTEGER;
  clients_with_id INTEGER;
  contacts_total INTEGER;
  contacts_with_id INTEGER;
BEGIN
  -- Count clients
  SELECT COUNT(*), COUNT(hubspot_company_id)
  INTO clients_total, clients_with_id
  FROM clients;

  -- Count contacts
  SELECT COUNT(*), COUNT(hubspot_company_id)
  INTO contacts_total, contacts_with_id
  FROM contacts;

  RAISE NOTICE '';
  RAISE NOTICE '================================================================================';
  RAISE NOTICE 'MIGRATION COMPLETE: hubspot_company_id added to missing tables';
  RAISE NOTICE '================================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'clients:  % total, % with hubspot_company_id', clients_total, clients_with_id;
  RAISE NOTICE 'contacts: % total, % with hubspot_company_id', contacts_total, contacts_with_id;
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '  1. Backfill clients.hubspot_company_id from HubSpot API';
  RAISE NOTICE '  2. Backfill contacts.hubspot_company_id from HubSpot associations';
  RAISE NOTICE '  3. Run sync workflows from Admin UI';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- Sample queries after migration:
-- ============================================================================

-- Check clients:
-- SELECT id, name, hubspot_company_id FROM clients LIMIT 10;

-- Check contacts:
-- SELECT id, email, hubspot_contact_id, hubspot_company_id FROM contacts LIMIT 10;

-- Universal query pattern (now works on ALL tables):
-- SELECT * FROM clients WHERE hubspot_company_id = '12345';
-- SELECT * FROM contacts WHERE hubspot_company_id = '12345';
-- SELECT * FROM brightlocal_locations WHERE hubspot_company_id = '12345';
-- SELECT * FROM gbp_locations WHERE hubspot_company_id = '12345';
