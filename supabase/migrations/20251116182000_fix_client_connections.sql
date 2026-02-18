-- Migration: Fix Client Connections
-- Purpose: Make user_id nullable to support client connections without logged-in users
-- Author: Claude Code
-- Date: 2025-11-16

-- ============================================
-- STEP 1: Make user_id nullable
-- ============================================

-- Allow user_id to be NULL for client connections
-- Client connections use client_id instead of user_id
ALTER TABLE public.pipedream_connected_accounts
  ALTER COLUMN user_id DROP NOT NULL;

-- ============================================
-- STEP 2: Add constraint to ensure either user_id OR client_id is set
-- ============================================

-- Add check constraint: must have either user_id or client_id (or both)
ALTER TABLE public.pipedream_connected_accounts
  ADD CONSTRAINT check_user_or_client
  CHECK (user_id IS NOT NULL OR client_id IS NOT NULL);

-- ============================================
-- STEP 3: Update RLS policies to handle null user_id
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Agency staff can view all connected accounts"
  ON public.pipedream_connected_accounts;
DROP POLICY IF EXISTS "Agency staff can insert connected accounts"
  ON public.pipedream_connected_accounts;
DROP POLICY IF EXISTS "Agency staff can update connected accounts"
  ON public.pipedream_connected_accounts;
DROP POLICY IF EXISTS "Agency staff can delete connected accounts"
  ON public.pipedream_connected_accounts;

-- Recreate policies with proper handling for client connections
CREATE POLICY "Agency staff can view all connected accounts"
  ON public.pipedream_connected_accounts
  FOR SELECT
  TO authenticated
  USING (true); -- All authenticated users can see all accounts

CREATE POLICY "Agency staff can insert connected accounts"
  ON public.pipedream_connected_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Agency staff can add any connection

CREATE POLICY "Agency staff can update connected accounts"
  ON public.pipedream_connected_accounts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Agency staff can delete connected accounts"
  ON public.pipedream_connected_accounts
  FOR DELETE
  TO authenticated
  USING (true);

-- Also create policies for service role (used by public API)
CREATE POLICY "Service role full access"
  ON public.pipedream_connected_accounts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- STEP 4: Create indexes for better query performance
-- ============================================

-- Create index for querying by user_id (when not null)
CREATE INDEX IF NOT EXISTS idx_pipedream_accounts_user_id
  ON public.pipedream_connected_accounts(user_id)
  WHERE user_id IS NOT NULL;

-- Index already exists for client_id from previous migration

-- ============================================
-- STEP 5: Add comments for documentation
-- ============================================

COMMENT ON COLUMN public.pipedream_connected_accounts.user_id IS
  'User ID for direct connections (agency staff). NULL for client connections.';

COMMENT ON COLUMN public.pipedream_connected_accounts.client_id IS
  'Client ID for client connections. NULL for direct connections.';

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this to verify the migration:
-- SELECT user_id, client_id, external_id, account_name
-- FROM public.pipedream_connected_accounts
-- ORDER BY created_at DESC;