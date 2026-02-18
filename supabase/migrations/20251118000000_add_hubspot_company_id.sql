-- Migration: Add hubspot_company_id to clients table
-- Purpose: Store HubSpot company ID separately from Supabase UUID
-- Author: Claude Code
-- Date: 2025-11-18
-- Version: IDEMPOTENT - Safe to run multiple times

-- ============================================
-- STEP 1: Add hubspot_company_id column
-- ============================================

DO $$
BEGIN
  -- Add hubspot_company_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'clients'
    AND column_name = 'hubspot_company_id'
  ) THEN
    ALTER TABLE public.clients
      ADD COLUMN hubspot_company_id TEXT;

    RAISE NOTICE '✅ Added hubspot_company_id column to clients table';
  ELSE
    RAISE NOTICE '⏭️  Column hubspot_company_id already exists, skipping';
  END IF;
END $$;

-- ============================================
-- STEP 2: Backfill existing records
-- ============================================

-- For existing records where id is the HubSpot company ID,
-- copy id to hubspot_company_id
DO $$
DECLARE
  affected_rows INTEGER;
BEGIN
  -- Update records where hubspot_company_id is NULL
  -- and id looks like a HubSpot ID (numeric string)
  -- Cast UUID to TEXT for regex matching
  UPDATE public.clients
  SET hubspot_company_id = id::text
  WHERE hubspot_company_id IS NULL
  AND id::text ~ '^[0-9]+$';  -- Regex: matches numeric strings

  GET DIAGNOSTICS affected_rows = ROW_COUNT;

  IF affected_rows > 0 THEN
    RAISE NOTICE '✅ Backfilled hubspot_company_id for % existing client(s)', affected_rows;
  ELSE
    RAISE NOTICE '⏭️  No clients needed backfilling';
  END IF;
END $$;

-- ============================================
-- STEP 3: Create index for HubSpot ID lookups
-- ============================================

CREATE INDEX IF NOT EXISTS idx_clients_hubspot_company_id
  ON public.clients(hubspot_company_id);

-- ============================================
-- STEP 4: Add column comment for documentation
-- ============================================

COMMENT ON COLUMN public.clients.hubspot_company_id IS
  'HubSpot Company ID (hs_object_id) linking this client to their HubSpot company record. Used for sync operations and data correlation.';

-- ============================================
-- STEP 5: Add unique constraint (optional - commented out)
-- ============================================

-- Uncomment if you want to enforce one Supabase client per HubSpot company:
-- ALTER TABLE public.clients
--   ADD CONSTRAINT unique_hubspot_company_id
--   UNIQUE (hubspot_company_id);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

DO $$
DECLARE
  total_clients INTEGER;
  clients_with_hubspot_id INTEGER;
  clients_without_hubspot_id INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_clients FROM public.clients;
  SELECT COUNT(*) INTO clients_with_hubspot_id FROM public.clients WHERE hubspot_company_id IS NOT NULL;
  SELECT COUNT(*) INTO clients_without_hubspot_id FROM public.clients WHERE hubspot_company_id IS NULL;

  RAISE NOTICE '';
  RAISE NOTICE '================================================================================';
  RAISE NOTICE 'MIGRATION COMPLETE: Added hubspot_company_id to clients table';
  RAISE NOTICE '================================================================================';
  RAISE NOTICE 'Total clients: %', total_clients;
  RAISE NOTICE 'Clients with HubSpot ID: %', clients_with_hubspot_id;
  RAISE NOTICE 'Clients without HubSpot ID: %', clients_without_hubspot_id;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Update client creation code to populate hubspot_company_id';
  RAISE NOTICE '  2. Update client lookup logic to search by hubspot_company_id';
  RAISE NOTICE '  3. Run: SELECT id, name, hubspot_company_id FROM public.clients;';
  RAISE NOTICE '';
END $$;

-- Sample verification query (commented out):
-- SELECT
--   id,
--   name,
--   business_name,
--   hubspot_company_id,
--   status,
--   created_at
-- FROM public.clients
-- ORDER BY created_at DESC
-- LIMIT 20;
