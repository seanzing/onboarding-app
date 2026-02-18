-- ============================================================================
-- Migration: Add hubspot_company_id to GBP Tables
-- ============================================================================
--
-- Purpose: Implement Universal HubSpot ID Strategy for GBP integration
--          by adding hubspot_company_id to all GBP tables for simple queries.
--
-- Problem: Current GBP structure requires 4-table JOINs to get hubspot_company_id:
--          gbp_locations → gbp_accounts → gbp_connections → gbp_clients
--
-- Solution: Add hubspot_company_id directly to each table (denormalization)
--           with triggers to auto-populate on INSERT.
--
-- Author: Claude Code
-- Date: 2025-11-25
-- Idempotent: YES - Safe to run multiple times
--
-- ============================================================================

-- ============================================================================
-- STEP 1: Add hubspot_company_id columns to GBP tables
-- ============================================================================

-- Add to gbp_connections
ALTER TABLE gbp_connections
ADD COLUMN IF NOT EXISTS hubspot_company_id TEXT;

-- Add to gbp_accounts
ALTER TABLE gbp_accounts
ADD COLUMN IF NOT EXISTS hubspot_company_id TEXT;

-- Add to gbp_locations
ALTER TABLE gbp_locations
ADD COLUMN IF NOT EXISTS hubspot_company_id TEXT;

-- ============================================================================
-- STEP 2: Create indexes for fast lookups
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_gbp_connections_hubspot_company_id
ON gbp_connections(hubspot_company_id);

CREATE INDEX IF NOT EXISTS idx_gbp_accounts_hubspot_company_id
ON gbp_accounts(hubspot_company_id);

CREATE INDEX IF NOT EXISTS idx_gbp_locations_hubspot_company_id
ON gbp_locations(hubspot_company_id);

-- ============================================================================
-- STEP 3: Backfill existing data (idempotent - only updates NULL values)
-- ============================================================================

-- Backfill gbp_connections from gbp_clients
UPDATE gbp_connections gconn
SET hubspot_company_id = gc.hubspot_company_id
FROM gbp_clients gc
WHERE gconn.client_id = gc.id
  AND gconn.hubspot_company_id IS NULL
  AND gc.hubspot_company_id IS NOT NULL;

-- Backfill gbp_accounts from gbp_connections
UPDATE gbp_accounts ga
SET hubspot_company_id = gconn.hubspot_company_id
FROM gbp_connections gconn
WHERE ga.connection_id = gconn.id
  AND ga.hubspot_company_id IS NULL
  AND gconn.hubspot_company_id IS NOT NULL;

-- Backfill gbp_locations from gbp_accounts
UPDATE gbp_locations gl
SET hubspot_company_id = ga.hubspot_company_id
FROM gbp_accounts ga
WHERE gl.account_id = ga.id
  AND gl.hubspot_company_id IS NULL
  AND ga.hubspot_company_id IS NOT NULL;

-- ============================================================================
-- STEP 4: Create trigger functions to auto-populate hubspot_company_id
-- ============================================================================

-- Function: Auto-populate hubspot_company_id for gbp_connections
CREATE OR REPLACE FUNCTION populate_gbp_connection_hubspot_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If hubspot_company_id not provided, get it from gbp_clients
  IF NEW.hubspot_company_id IS NULL AND NEW.client_id IS NOT NULL THEN
    SELECT hubspot_company_id INTO NEW.hubspot_company_id
    FROM gbp_clients
    WHERE id = NEW.client_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Auto-populate hubspot_company_id for gbp_accounts
CREATE OR REPLACE FUNCTION populate_gbp_account_hubspot_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If hubspot_company_id not provided, get it from gbp_connections
  IF NEW.hubspot_company_id IS NULL AND NEW.connection_id IS NOT NULL THEN
    SELECT hubspot_company_id INTO NEW.hubspot_company_id
    FROM gbp_connections
    WHERE id = NEW.connection_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Auto-populate hubspot_company_id for gbp_locations
CREATE OR REPLACE FUNCTION populate_gbp_location_hubspot_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If hubspot_company_id not provided, get it from gbp_accounts
  IF NEW.hubspot_company_id IS NULL AND NEW.account_id IS NOT NULL THEN
    SELECT hubspot_company_id INTO NEW.hubspot_company_id
    FROM gbp_accounts
    WHERE id = NEW.account_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 5: Create triggers (drop first to make idempotent)
-- ============================================================================

-- Trigger for gbp_connections
DROP TRIGGER IF EXISTS trigger_populate_gbp_connection_hubspot_id ON gbp_connections;
CREATE TRIGGER trigger_populate_gbp_connection_hubspot_id
  BEFORE INSERT ON gbp_connections
  FOR EACH ROW
  EXECUTE FUNCTION populate_gbp_connection_hubspot_id();

-- Trigger for gbp_accounts
DROP TRIGGER IF EXISTS trigger_populate_gbp_account_hubspot_id ON gbp_accounts;
CREATE TRIGGER trigger_populate_gbp_account_hubspot_id
  BEFORE INSERT ON gbp_accounts
  FOR EACH ROW
  EXECUTE FUNCTION populate_gbp_account_hubspot_id();

-- Trigger for gbp_locations
DROP TRIGGER IF EXISTS trigger_populate_gbp_location_hubspot_id ON gbp_locations;
CREATE TRIGGER trigger_populate_gbp_location_hubspot_id
  BEFORE INSERT ON gbp_locations
  FOR EACH ROW
  EXECUTE FUNCTION populate_gbp_location_hubspot_id();

-- ============================================================================
-- STEP 6: Add column comments for documentation
-- ============================================================================

COMMENT ON COLUMN gbp_connections.hubspot_company_id IS
  'HubSpot company ID (hs_object_id) - Universal identifier for cross-integration linking. Auto-populated from gbp_clients on INSERT.';

COMMENT ON COLUMN gbp_accounts.hubspot_company_id IS
  'HubSpot company ID (hs_object_id) - Universal identifier for cross-integration linking. Auto-populated from gbp_connections on INSERT.';

COMMENT ON COLUMN gbp_locations.hubspot_company_id IS
  'HubSpot company ID (hs_object_id) - Universal identifier for cross-integration linking. Auto-populated from gbp_accounts on INSERT. Enables simple queries without JOINs.';

-- ============================================================================
-- STEP 7: Verification (run manually)
-- ============================================================================

DO $$
DECLARE
  conn_total INTEGER;
  conn_with_id INTEGER;
  acct_total INTEGER;
  acct_with_id INTEGER;
  loc_total INTEGER;
  loc_with_id INTEGER;
BEGIN
  -- Count gbp_connections
  SELECT COUNT(*), COUNT(hubspot_company_id)
  INTO conn_total, conn_with_id
  FROM gbp_connections;

  -- Count gbp_accounts
  SELECT COUNT(*), COUNT(hubspot_company_id)
  INTO acct_total, acct_with_id
  FROM gbp_accounts;

  -- Count gbp_locations
  SELECT COUNT(*), COUNT(hubspot_company_id)
  INTO loc_total, loc_with_id
  FROM gbp_locations;

  RAISE NOTICE '';
  RAISE NOTICE '================================================================================';
  RAISE NOTICE 'MIGRATION COMPLETE: hubspot_company_id added to GBP tables';
  RAISE NOTICE '================================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'gbp_connections: % total, % with hubspot_company_id', conn_total, conn_with_id;
  RAISE NOTICE 'gbp_accounts:    % total, % with hubspot_company_id', acct_total, acct_with_id;
  RAISE NOTICE 'gbp_locations:   % total, % with hubspot_company_id', loc_total, loc_with_id;
  RAISE NOTICE '';
  RAISE NOTICE 'You can now query GBP locations directly:';
  RAISE NOTICE '  SELECT * FROM gbp_locations WHERE hubspot_company_id = ''12345'';';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- Sample verification queries (run manually if needed):
-- ============================================================================

-- Check gbp_connections:
-- SELECT id, client_id, google_email, hubspot_company_id FROM gbp_connections;

-- Check gbp_accounts:
-- SELECT id, connection_id, account_name, hubspot_company_id FROM gbp_accounts;

-- Check gbp_locations:
-- SELECT id, account_id, title, hubspot_company_id FROM gbp_locations;

-- Query by HubSpot company ID (now simple!):
-- SELECT * FROM gbp_locations WHERE hubspot_company_id = 'YOUR_HUBSPOT_ID';

-- Compare before/after query complexity:
-- BEFORE (4 JOINs):
--   SELECT gl.* FROM gbp_locations gl
--   JOIN gbp_accounts ga ON gl.account_id = ga.id
--   JOIN gbp_connections gc ON ga.connection_id = gc.id
--   JOIN gbp_clients gclients ON gc.client_id = gclients.id
--   WHERE gclients.hubspot_company_id = '12345';
--
-- AFTER (direct):
--   SELECT * FROM gbp_locations WHERE hubspot_company_id = '12345';
