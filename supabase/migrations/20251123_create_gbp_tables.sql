-- GBP Multi-Client Support Tables
-- Migration: 20251123_create_gbp_tables
--
-- Architecture: Zing employees manage CLIENT Google accounts
-- All employees can access all connected client accounts

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- NOTE: Removed DROP TABLE CASCADE statements for safety
-- Using CREATE TABLE IF NOT EXISTS for idempotency without data loss

-- Table: gbp_clients
-- Represents a client whose GBP accounts we manage
CREATE TABLE IF NOT EXISTS gbp_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_name TEXT NOT NULL,
  hubspot_company_id TEXT,  -- Optional link to HubSpot company
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),  -- Which Zing employee added this client
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: gbp_connections
-- Stores OAuth connections for client Google accounts
-- Uses Pipedream for token management
CREATE TABLE IF NOT EXISTS gbp_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES gbp_clients(id) ON DELETE CASCADE,
  google_email TEXT NOT NULL,
  pipedream_account_id TEXT,  -- Pipedream's reference for this OAuth connection
  -- Fallback token storage if not using Pipedream
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  connected_by UUID REFERENCES auth.users(id),  -- Which Zing employee connected it
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, google_email)
);

-- Table: gbp_accounts
-- Cached GBP accounts for each connection (owned + managed)
CREATE TABLE IF NOT EXISTS gbp_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES gbp_connections(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,  -- GBP account ID
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL,  -- PERSONAL, LOCATION_GROUP, USER_GROUP, ORGANIZATION
  role TEXT NOT NULL,  -- PRIMARY_OWNER, OWNER, MANAGER, SITE_MANAGER
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(connection_id, account_id)
);

-- Table: gbp_locations
-- Cached GBP locations for each account
CREATE TABLE IF NOT EXISTS gbp_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES gbp_accounts(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL,  -- GBP location ID
  title TEXT NOT NULL,
  primary_phone TEXT,
  website_uri TEXT,
  primary_category TEXT,
  address_summary TEXT,
  place_id TEXT,
  maps_uri TEXT,
  metadata JSONB,  -- Store eligibility flags and other metadata
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, location_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_gbp_clients_hubspot ON gbp_clients(hubspot_company_id);
CREATE INDEX IF NOT EXISTS idx_gbp_connections_client_id ON gbp_connections(client_id);
CREATE INDEX IF NOT EXISTS idx_gbp_accounts_connection_id ON gbp_accounts(connection_id);
CREATE INDEX IF NOT EXISTS idx_gbp_locations_account_id ON gbp_locations(account_id);

-- Row Level Security (RLS)
-- Since this is an internal tool, all authenticated Zing employees can access all data
ALTER TABLE gbp_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Any authenticated user (Zing employee) can access all data
-- Drop existing policies first to make idempotent
DROP POLICY IF EXISTS "Employees can access all clients" ON gbp_clients;
DROP POLICY IF EXISTS "Employees can access all connections" ON gbp_connections;
DROP POLICY IF EXISTS "Employees can access all accounts" ON gbp_accounts;
DROP POLICY IF EXISTS "Employees can access all locations" ON gbp_locations;

CREATE POLICY "Employees can access all clients" ON gbp_clients
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Employees can access all connections" ON gbp_connections
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Employees can access all accounts" ON gbp_accounts
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Employees can access all locations" ON gbp_locations
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at (drop first to make idempotent)
DROP TRIGGER IF EXISTS update_gbp_clients_updated_at ON gbp_clients;
DROP TRIGGER IF EXISTS update_gbp_connections_updated_at ON gbp_connections;
DROP TRIGGER IF EXISTS update_gbp_accounts_updated_at ON gbp_accounts;

CREATE TRIGGER update_gbp_clients_updated_at
  BEFORE UPDATE ON gbp_clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gbp_connections_updated_at
  BEFORE UPDATE ON gbp_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gbp_accounts_updated_at
  BEFORE UPDATE ON gbp_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
