-- Migration: Agency Model Schema Updates (IDEMPOTENT)
-- Purpose: Add clients table and update RLS policies for agency-wide access
-- Author: Claude Code
-- Date: 2025-11-16
-- Version: FULLY IDEMPOTENT - Safe to run multiple times

-- ============================================
-- STEP 1: Create clients table
-- ============================================

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  business_name TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON public.clients(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_business_name ON public.clients(business_name);

-- Enable RLS (idempotent check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'clients'
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create RLS policies for clients table (idempotent)
DO $$
BEGIN
  -- Drop and recreate to ensure correct configuration
  DROP POLICY IF EXISTS "Agency staff can view all clients" ON public.clients;
  CREATE POLICY "Agency staff can view all clients"
    ON public.clients
    FOR SELECT
    TO authenticated
    USING (true);

  DROP POLICY IF EXISTS "Agency staff can insert clients" ON public.clients;
  CREATE POLICY "Agency staff can insert clients"
    ON public.clients
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

  DROP POLICY IF EXISTS "Agency staff can update clients" ON public.clients;
  CREATE POLICY "Agency staff can update clients"
    ON public.clients
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

  DROP POLICY IF EXISTS "Agency staff can delete clients" ON public.clients;
  CREATE POLICY "Agency staff can delete clients"
    ON public.clients
    FOR DELETE
    TO authenticated
    USING (true);
END $$;

-- Create trigger function for updated_at (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (idempotent)
DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 2: Add client_id to pipedream_connected_accounts
-- ============================================

DO $$
BEGIN
  -- Add client_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'pipedream_connected_accounts'
    AND column_name = 'client_id'
  ) THEN
    ALTER TABLE public.pipedream_connected_accounts
      ADD COLUMN client_id UUID REFERENCES public.clients(id);
  END IF;

  -- Create index for client lookups (idempotent)
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'pipedream_connected_accounts'
    AND indexname = 'idx_pipedream_accounts_client_id'
  ) THEN
    CREATE INDEX idx_pipedream_accounts_client_id
      ON public.pipedream_connected_accounts(client_id);
  END IF;
END $$;

-- ============================================
-- STEP 3: Make user_id nullable for client connections
-- ============================================

DO $$
BEGIN
  -- Make user_id nullable (idempotent check)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'pipedream_connected_accounts'
    AND column_name = 'user_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.pipedream_connected_accounts
      ALTER COLUMN user_id DROP NOT NULL;
  END IF;

  -- Add check constraint (idempotent)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_schema = 'public'
    AND table_name = 'pipedream_connected_accounts'
    AND constraint_name = 'check_user_or_client'
  ) THEN
    ALTER TABLE public.pipedream_connected_accounts
      ADD CONSTRAINT check_user_or_client
      CHECK (user_id IS NOT NULL OR client_id IS NOT NULL);
  END IF;
END $$;

-- ============================================
-- STEP 4: Update RLS policies for agency-wide access
-- ============================================

-- Enable RLS on pipedream_connected_accounts (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'pipedream_connected_accounts'
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.pipedream_connected_accounts ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create RLS policies for pipedream_connected_accounts (idempotent)
DO $$
BEGIN
  -- Drop all existing policies first
  DROP POLICY IF EXISTS "Users can view their own connected accounts" ON public.pipedream_connected_accounts;
  DROP POLICY IF EXISTS "Users can insert their own connected accounts" ON public.pipedream_connected_accounts;
  DROP POLICY IF EXISTS "Users can update their own connected accounts" ON public.pipedream_connected_accounts;
  DROP POLICY IF EXISTS "Users can delete their own connected accounts" ON public.pipedream_connected_accounts;
  DROP POLICY IF EXISTS "Agency staff can view all connected accounts" ON public.pipedream_connected_accounts;
  DROP POLICY IF EXISTS "Agency staff can insert connected accounts" ON public.pipedream_connected_accounts;
  DROP POLICY IF EXISTS "Agency staff can update connected accounts" ON public.pipedream_connected_accounts;
  DROP POLICY IF EXISTS "Agency staff can delete connected accounts" ON public.pipedream_connected_accounts;
  DROP POLICY IF EXISTS "Service role full access" ON public.pipedream_connected_accounts;

  -- Create new agency-wide policies
  CREATE POLICY "Agency staff can view all connected accounts"
    ON public.pipedream_connected_accounts
    FOR SELECT
    TO authenticated
    USING (true);

  CREATE POLICY "Agency staff can insert connected accounts"
    ON public.pipedream_connected_accounts
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

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

  -- Service role policy for API access
  CREATE POLICY "Service role full access"
    ON public.pipedream_connected_accounts
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
END $$;

-- ============================================
-- STEP 5: Create indexes for better query performance
-- ============================================

-- Create index for querying by user_id when not null (idempotent)
CREATE INDEX IF NOT EXISTS idx_pipedream_accounts_user_id
  ON public.pipedream_connected_accounts(user_id)
  WHERE user_id IS NOT NULL;

-- ============================================
-- STEP 6: Grant permissions
-- ============================================

GRANT ALL ON public.clients TO authenticated;
GRANT ALL ON public.pipedream_connected_accounts TO authenticated;

-- ============================================
-- STEP 7: Add comments for documentation
-- ============================================

COMMENT ON TABLE public.clients IS
  'Stores client information for the agency. Each client can have multiple GBP accounts connected via Pipedream.';

COMMENT ON COLUMN public.clients.id IS
  'Unique identifier for the client. This UUID is used as external_id in Pipedream Connect.';

COMMENT ON COLUMN public.pipedream_connected_accounts.client_id IS
  'References the client this connected account belongs to. Should match external_id in Pipedream.';

COMMENT ON COLUMN public.pipedream_connected_accounts.user_id IS
  'User ID for the Zing worker who connected the account (for audit trail). NULL for client-initiated connections.';

COMMENT ON COLUMN public.pipedream_connected_accounts.external_id IS
  'Pipedream external_id. Should match client_id for proper client isolation.';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the migration:
-- SELECT * FROM public.clients ORDER BY created_at DESC;
-- SELECT user_id, client_id, external_id, account_name, healthy FROM public.pipedream_connected_accounts ORDER BY created_at DESC;
-- SELECT COUNT(*) as client_count FROM public.clients;
-- SELECT COUNT(*) as account_count, COUNT(DISTINCT client_id) as unique_clients FROM public.pipedream_connected_accounts WHERE client_id IS NOT NULL;
