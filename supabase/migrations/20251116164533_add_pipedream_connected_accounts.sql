-- Migration: Add Pipedream Connected Accounts Table
-- Purpose: Store mapping between users and their connected Pipedream accounts (Google Business Profile, etc.)
-- Author: Claude Code
-- Date: 2025-11-16

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create pipedream_connected_accounts table (idempotent)
CREATE TABLE IF NOT EXISTS public.pipedream_connected_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pipedream_account_id TEXT NOT NULL,  -- Pipedream's internal account ID (e.g., "apn_5dhkDxM")
  external_id TEXT,                     -- Should match user_id (what we pass to Pipedream as externalUserId)
  app_name TEXT DEFAULT 'google_my_business',  -- App slug from Pipedream
  account_name TEXT,                    -- Display name (e.g., "Nathan Clay")
  account_email TEXT,                   -- Email associated with the account
  healthy BOOLEAN DEFAULT true,         -- Account health status from Pipedream
  metadata JSONB DEFAULT '{}'::jsonb,   -- Additional metadata from Pipedream
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast lookups (idempotent)
CREATE INDEX IF NOT EXISTS idx_pipedream_accounts_user_id
  ON public.pipedream_connected_accounts(user_id);

CREATE INDEX IF NOT EXISTS idx_pipedream_accounts_pipedream_id
  ON public.pipedream_connected_accounts(pipedream_account_id);

CREATE INDEX IF NOT EXISTS idx_pipedream_accounts_app_name
  ON public.pipedream_connected_accounts(app_name);

-- Create unique constraint to prevent duplicate account connections (idempotent)
DO $$ BEGIN
  ALTER TABLE public.pipedream_connected_accounts
    ADD CONSTRAINT unique_user_pipedream_account
    UNIQUE(user_id, pipedream_account_id);
EXCEPTION
  WHEN duplicate_table THEN NULL;  -- Ignore if constraint already exists
END $$;

-- Add updated_at trigger function (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at timestamp (idempotent)
DO $$ BEGIN
  CREATE TRIGGER update_pipedream_accounts_updated_at
    BEFORE UPDATE ON public.pipedream_connected_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;  -- Ignore if trigger already exists
END $$;

-- Enable Row Level Security (RLS)
ALTER TABLE public.pipedream_connected_accounts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to make migration idempotent)
DROP POLICY IF EXISTS "Users can view their own connected accounts"
  ON public.pipedream_connected_accounts;
DROP POLICY IF EXISTS "Users can insert their own connected accounts"
  ON public.pipedream_connected_accounts;
DROP POLICY IF EXISTS "Users can update their own connected accounts"
  ON public.pipedream_connected_accounts;
DROP POLICY IF EXISTS "Users can delete their own connected accounts"
  ON public.pipedream_connected_accounts;

-- Create RLS policies
-- Policy: Users can only view their own connected accounts
CREATE POLICY "Users can view their own connected accounts"
  ON public.pipedream_connected_accounts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own connected accounts
CREATE POLICY "Users can insert their own connected accounts"
  ON public.pipedream_connected_accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own connected accounts
CREATE POLICY "Users can update their own connected accounts"
  ON public.pipedream_connected_accounts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own connected accounts
CREATE POLICY "Users can delete their own connected accounts"
  ON public.pipedream_connected_accounts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipedream_connected_accounts
  TO authenticated;

GRANT USAGE ON SCHEMA public TO authenticated;

-- Add helpful comment
COMMENT ON TABLE public.pipedream_connected_accounts IS
  'Stores connected Pipedream accounts (Google Business Profile, etc.) for each user. Managed by Pipedream Connect OAuth flow with RLS policies for user isolation.';
