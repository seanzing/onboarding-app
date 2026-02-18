-- Migration: Add UNIQUE constraint on hubspot_company_id
-- Purpose: Prevent duplicate clients for the same HubSpot company (race conditions)
-- Author: Claude Code
-- Date: 2025-11-18
-- Version: IDEMPOTENT - Safe to run multiple times

-- ============================================
-- STEP 1: Add UNIQUE constraint
-- ============================================

DO $$
BEGIN
  -- Add unique constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_hubspot_company_id'
    AND conrelid = 'public.clients'::regclass
  ) THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT unique_hubspot_company_id
      UNIQUE (hubspot_company_id);

    RAISE NOTICE '✅ Added UNIQUE constraint on hubspot_company_id';
  ELSE
    RAISE NOTICE '⏭️  UNIQUE constraint already exists, skipping';
  END IF;
END $$;

-- ============================================
-- STEP 2: Verify constraint
-- ============================================

DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_hubspot_company_id'
    AND conrelid = 'public.clients'::regclass
  ) INTO constraint_exists;

  IF constraint_exists THEN
    RAISE NOTICE '✅ UNIQUE constraint verified: hubspot_company_id';
  ELSE
    RAISE NOTICE '❌ UNIQUE constraint NOT found';
  END IF;
END $$;

-- ============================================
-- Documentation
-- ============================================

COMMENT ON CONSTRAINT unique_hubspot_company_id ON public.clients IS
  'Ensures one Supabase client per HubSpot company. Prevents duplicate clients. Allows NULL values (manually created clients without HubSpot ID).';

-- ============================================
-- VERIFICATION
-- ============================================

-- This query should show the constraint:
-- SELECT
--   conname as constraint_name,
--   contype as constraint_type,
--   pg_get_constraintdef(oid) as definition
-- FROM pg_constraint
-- WHERE conrelid = 'public.clients'::regclass
-- AND conname = 'unique_hubspot_company_id';

-- Test the constraint (should fail on second insert):
-- INSERT INTO clients (hubspot_company_id, name) VALUES ('test123', 'Test 1'); -- Success
-- INSERT INTO clients (hubspot_company_id, name) VALUES ('test123', 'Test 2'); -- Should fail
-- DELETE FROM clients WHERE hubspot_company_id = 'test123'; -- Cleanup
