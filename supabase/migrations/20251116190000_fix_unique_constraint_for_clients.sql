-- Migration: Fix Unique Constraint for Client Connections
-- Purpose: Replace user_id-based unique constraint with one that handles NULL values correctly
-- Author: Claude Code
-- Date: 2025-11-16

-- ============================================
-- STEP 1: Drop the existing problematic constraint
-- ============================================

-- The old constraint UNIQUE(user_id, pipedream_account_id) doesn't work well
-- when user_id is NULL for client connections. PostgreSQL treats NULL specially
-- in unique constraints, which can lead to unexpected behavior.

ALTER TABLE public.pipedream_connected_accounts
  DROP CONSTRAINT IF EXISTS unique_user_pipedream_account;

-- ============================================
-- STEP 2: Create separate unique constraints for each connection type
-- ============================================

-- For user connections (user_id IS NOT NULL):
-- Ensure a user can't connect the same Pipedream account twice
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_pipedream_account
  ON public.pipedream_connected_accounts(user_id, pipedream_account_id)
  WHERE user_id IS NOT NULL;

-- For client connections (client_id IS NOT NULL):
-- Ensure a client can't connect the same Pipedream account twice
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_client_pipedream_account
  ON public.pipedream_connected_accounts(client_id, pipedream_account_id)
  WHERE client_id IS NOT NULL;

-- Also ensure that each Pipedream account can only be connected once overall
-- (prevents the same GBP account from being connected to multiple clients/users)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pipedream_account
  ON public.pipedream_connected_accounts(pipedream_account_id);

-- ============================================
-- STEP 3: Add additional indexes for better query performance
-- ============================================

-- Index for external_id lookups (used in OAuth callback)
CREATE INDEX IF NOT EXISTS idx_pipedream_accounts_external_id
  ON public.pipedream_connected_accounts(external_id)
  WHERE external_id IS NOT NULL;

-- ============================================
-- STEP 4: Add helpful comments
-- ============================================

COMMENT ON INDEX idx_unique_user_pipedream_account IS
  'Ensures a user cannot connect the same Pipedream account twice (only applies when user_id IS NOT NULL)';

COMMENT ON INDEX idx_unique_client_pipedream_account IS
  'Ensures a client cannot connect the same Pipedream account twice (only applies when client_id IS NOT NULL)';

COMMENT ON INDEX idx_unique_pipedream_account IS
  'Ensures each Pipedream account can only be connected once across all users and clients (prevents duplicate GBP connections)';

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these to verify the migration:
-- \d+ pipedream_connected_accounts
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'pipedream_connected_accounts';
