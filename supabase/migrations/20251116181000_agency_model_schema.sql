-- Migration: Agency Model Schema Updates
-- Purpose: Add clients table and update RLS policies for agency-wide access
-- Author: Claude Code
-- Date: 2025-11-16

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON public.clients(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_business_name ON public.clients(business_name);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - all authenticated users (agency staff) can manage clients
CREATE POLICY "Agency staff can view all clients"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Agency staff can insert clients"
  ON public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Agency staff can update clients"
  ON public.clients
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Agency staff can delete clients"
  ON public.clients
  FOR DELETE
  TO authenticated
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 2: Add client_id to pipedream_connected_accounts
-- ============================================

-- Add client_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'pipedream_connected_accounts'
    AND column_name = 'client_id'
  ) THEN
    ALTER TABLE public.pipedream_connected_accounts
      ADD COLUMN client_id UUID REFERENCES public.clients(id);

    -- Create index for client lookups
    CREATE INDEX idx_pipedream_accounts_client_id
      ON public.pipedream_connected_accounts(client_id);
  END IF;
END $$;

-- ============================================
-- STEP 3: Update RLS policies for agency-wide access
-- ============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own connected accounts"
  ON public.pipedream_connected_accounts;
DROP POLICY IF EXISTS "Users can insert their own connected accounts"
  ON public.pipedream_connected_accounts;
DROP POLICY IF EXISTS "Users can update their own connected accounts"
  ON public.pipedream_connected_accounts;
DROP POLICY IF EXISTS "Users can delete their own connected accounts"
  ON public.pipedream_connected_accounts;

-- Create new agency-wide policies
CREATE POLICY "Agency staff can view all connected accounts"
  ON public.pipedream_connected_accounts
  FOR SELECT
  TO authenticated
  USING (true);  -- All authenticated users (agency staff) can see all accounts

CREATE POLICY "Agency staff can insert connected accounts"
  ON public.pipedream_connected_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);  -- Any staff can add new connections

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

-- ============================================
-- STEP 4: Grant permissions
-- ============================================

GRANT ALL ON public.clients TO authenticated;
GRANT ALL ON public.pipedream_connected_accounts TO authenticated;

-- ============================================
-- STEP 5: Add comments for documentation
-- ============================================

COMMENT ON TABLE public.clients IS
  'Stores client information for the agency. Each client can have multiple GBP accounts connected via Pipedream.';

COMMENT ON COLUMN public.pipedream_connected_accounts.client_id IS
  'References the client this connected account belongs to. NULL for legacy connections.';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the migration:
-- SELECT * FROM public.clients;
-- SELECT * FROM public.pipedream_connected_accounts;