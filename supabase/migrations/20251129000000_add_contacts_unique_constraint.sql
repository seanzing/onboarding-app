-- Migration: Add UNIQUE constraint on contacts (hubspot_contact_id, user_id)
-- Purpose: Enable UPSERT operations for HubSpot contact sync
-- Author: Claude Code
-- Date: 2025-11-29
-- Version: IDEMPOTENT - Safe to run multiple times

-- ============================================
-- STEP 1: Add UNIQUE constraint
-- ============================================

DO $$
BEGIN
  -- Add unique constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contacts_hubspot_user_unique'
    AND conrelid = 'public.contacts'::regclass
  ) THEN
    ALTER TABLE public.contacts
      ADD CONSTRAINT contacts_hubspot_user_unique
      UNIQUE (hubspot_contact_id, user_id);

    RAISE NOTICE '✅ Added UNIQUE constraint on (hubspot_contact_id, user_id)';
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
    WHERE conname = 'contacts_hubspot_user_unique'
    AND conrelid = 'public.contacts'::regclass
  ) INTO constraint_exists;

  IF constraint_exists THEN
    RAISE NOTICE '✅ UNIQUE constraint verified: (hubspot_contact_id, user_id)';
  ELSE
    RAISE NOTICE '❌ UNIQUE constraint NOT found';
  END IF;
END $$;

-- ============================================
-- Documentation
-- ============================================

COMMENT ON CONSTRAINT contacts_hubspot_user_unique ON public.contacts IS
  'Ensures one contact per HubSpot contact ID per user. Enables UPSERT operations for sync. Prevents duplicate contacts.';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- This query should show the constraint:
-- SELECT
--   conname as constraint_name,
--   contype as constraint_type,
--   pg_get_constraintdef(oid) as definition
-- FROM pg_constraint
-- WHERE conrelid = 'public.contacts'::regclass
-- AND conname = 'contacts_hubspot_user_unique';
