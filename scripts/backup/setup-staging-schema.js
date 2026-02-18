/**
 * Setup Staging Database Schema
 *
 * This script creates the core tables in the STAGING database.
 *
 * TARGETS: STAGING (olywxnqoaazoujgpdlyw) - NOT PRODUCTION!
 *
 * Usage: node scripts/backup/setup-staging-schema.js
 */

const { Client } = require('pg');

// STAGING DATABASE ONLY - Triple-check this is correct!
const STAGING_CONFIG = {
  host: 'db.olywxnqoaazoujgpdlyw.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'IPtq38ZfnYYTQe0K',
  ssl: { rejectUnauthorized: false }
};

// Verify this is NOT production
const PRODUCTION_HOST = 'db.dtyrwmgoasbnyqrzfxng.supabase.co';
if (STAGING_CONFIG.host === PRODUCTION_HOST) {
  console.error('❌ ERROR: This script is trying to target PRODUCTION!');
  console.error('❌ ABORTING to prevent data loss!');
  process.exit(1);
}

const SCHEMA_SQL = `
-- ============================================================
-- STAGING DATABASE SCHEMA
-- Target: olywxnqoaazoujgpdlyw (STAGING ONLY!)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Drop existing tables (staging only - no production data!)
-- ============================================================
DROP TABLE IF EXISTS public.customer_sync_logs CASCADE;
DROP TABLE IF EXISTS public.enriched_businesses CASCADE;
DROP TABLE IF EXISTS public.gbp_locations CASCADE;
DROP TABLE IF EXISTS public.brightlocal_campaigns CASCADE;
DROP TABLE IF EXISTS public.brightlocal_locations CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.contacts CASCADE;

-- ============================================================
-- Core Tables
-- ============================================================

-- Contacts table (HubSpot customers)
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  hubspot_contact_id TEXT,
  hs_object_id TEXT,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  company TEXT,
  lifecycle_stage TEXT,
  lead_status TEXT,
  last_synced_at TIMESTAMPTZ,
  raw_properties JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clients table (Agency clients)
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hubspot_contact_id TEXT,
  name TEXT NOT NULL,
  business_name TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enriched Businesses table (Master business data)
CREATE TABLE public.enriched_businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hubspot_contact_id TEXT UNIQUE,
  hubspot_url TEXT,
  business_name TEXT NOT NULL,
  business_name_alternate TEXT,
  phone TEXT,
  phone_secondary TEXT,
  email TEXT,
  website TEXT,
  street_address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'United States',
  service_area TEXT,
  short_description TEXT,
  long_description TEXT,
  categories JSONB DEFAULT '[]',
  business_hours JSONB DEFAULT '{}',
  logo TEXT,
  images JSONB DEFAULT '[]',
  images_note TEXT,
  social_media JSONB DEFAULT '{}',
  attributes JSONB DEFAULT '{}',
  services JSONB DEFAULT '[]',
  certifications JSONB DEFAULT '[]',
  notes TEXT,
  enrichment_date DATE,
  enrichment_sources JSONB DEFAULT '[]',
  data_source TEXT,
  brightlocal_category_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BrightLocal Locations table
CREATE TABLE public.brightlocal_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hubspot_contact_id TEXT,
  brightlocal_location_id INTEGER UNIQUE,
  business_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postcode TEXT,
  country TEXT DEFAULT 'USA',
  telephone TEXT,
  website TEXT,
  business_category_id INTEGER,
  status TEXT DEFAULT 'active',
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BrightLocal Campaigns table
CREATE TABLE public.brightlocal_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hubspot_contact_id TEXT,
  campaign_id INTEGER UNIQUE,
  location_id INTEGER,
  campaign_name TEXT,
  status TEXT DEFAULT 'pending',
  citations_count INTEGER DEFAULT 0,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- GBP Locations table
CREATE TABLE public.gbp_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hubspot_contact_id TEXT,
  location_id TEXT,
  account_id TEXT,
  name TEXT,
  store_code TEXT,
  address JSONB,
  phone TEXT,
  website TEXT,
  categories JSONB,
  metadata JSONB,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Customer Sync Logs table
CREATE TABLE public.customer_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL,
  records_synced INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_contacts_hubspot_contact_id ON public.contacts(hubspot_contact_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(email);
CREATE INDEX IF NOT EXISTS idx_clients_hubspot_contact_id ON public.clients(hubspot_contact_id);
CREATE INDEX IF NOT EXISTS idx_enriched_businesses_hubspot_id ON public.enriched_businesses(hubspot_contact_id);
CREATE INDEX IF NOT EXISTS idx_brightlocal_locations_hubspot_id ON public.brightlocal_locations(hubspot_contact_id);
CREATE INDEX IF NOT EXISTS idx_brightlocal_campaigns_hubspot_id ON public.brightlocal_campaigns(hubspot_contact_id);
CREATE INDEX IF NOT EXISTS idx_gbp_locations_hubspot_id ON public.gbp_locations(hubspot_contact_id);

-- ============================================================
-- Schema setup complete!
-- ============================================================
`;

async function setupStagingSchema() {
  console.log('========================================================');
  console.log('STAGING DATABASE SCHEMA SETUP');
  console.log('========================================================');
  console.log('Target: olywxnqoaazoujgpdlyw (STAGING)');
  console.log('Host:', STAGING_CONFIG.host);
  console.log('');
  console.log('⚠️  This will CREATE tables in STAGING only!');
  console.log('⚠️  Production (dtyrwmgoasbnyqrzfxng) is NOT touched!');
  console.log('========================================================\n');

  const client = new Client(STAGING_CONFIG);

  try {
    console.log('Connecting to STAGING database...');
    await client.connect();
    console.log('✅ Connected to STAGING\n');

    console.log('Applying schema...');
    await client.query(SCHEMA_SQL);
    console.log('✅ Schema applied successfully!\n');

    // Verify tables were created
    console.log('Verifying tables...');
    const tables = ['contacts', 'clients', 'enriched_businesses', 'brightlocal_locations', 'brightlocal_campaigns', 'gbp_locations', 'customer_sync_logs'];

    for (const table of tables) {
      const result = await client.query(
        `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
        [table]
      );
      const exists = parseInt(result.rows[0].count) > 0;
      console.log(`  ${table}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
    }

    console.log('\n========================================================');
    console.log('STAGING SCHEMA SETUP COMPLETE!');
    console.log('========================================================');
    console.log('\nStaging database is ready for use.');
    console.log('To switch to staging, copy .env.staging to .env.local');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupStagingSchema();
