-- ============================================================================
-- Database Schema Cleanup for Natural Language Queries
-- Created: November 30, 2025
-- Purpose: Remove ghost tables and create user-friendly views
-- ============================================================================

-- ============================================================================
-- PHASE 1: Delete Empty Ghost Tables (9 tables - 0 rows each)
-- These were created but never populated, causing confusion
-- ============================================================================

DROP TABLE IF EXISTS gbp_clients CASCADE;
DROP TABLE IF EXISTS gbp_connections CASCADE;
DROP TABLE IF EXISTS gbp_accounts CASCADE;
DROP TABLE IF EXISTS gbp_locations CASCADE;
DROP TABLE IF EXISTS gbp_reviews_cache CASCADE;
DROP TABLE IF EXISTS gbp_reviews_individual CASCADE;
DROP TABLE IF EXISTS places_details_cache CASCADE;
DROP TABLE IF EXISTS transaction_log CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;

-- ============================================================================
-- PHASE 2: Create User-Friendly Views
-- These provide intuitive names while keeping underlying tables intact
-- ============================================================================

-- View: crm_contacts
-- Purpose: All HubSpot CRM contacts (leads, customers, opportunities)
-- Clarifies this is CRM data, not "client contacts"
CREATE OR REPLACE VIEW crm_contacts AS
SELECT
    id,
    hs_object_id as hubspot_id,
    email,
    firstname as first_name,
    lastname as last_name,
    phone,
    company,
    lifecyclestage as lifecycle_stage,
    createdate as created_at,
    lastmodifieddate as updated_at,
    synced_at
FROM contacts;

-- View: google_accounts
-- Purpose: Connected Google accounts for GBP access
-- Hides implementation detail (pipedream)
CREATE OR REPLACE VIEW google_accounts AS
SELECT
    id,
    pipedream_account_id as connection_id,
    account_name,
    account_email as email,
    external_id as google_id,
    healthy as is_healthy,
    client_id,
    created_at
FROM pipedream_connected_accounts;

-- View: managed_businesses
-- Purpose: Businesses we actively manage for directory services
-- Combines client info with enriched business data
CREATE OR REPLACE VIEW managed_businesses AS
SELECT
    COALESCE(eb.id::text, c.id::text) as id,
    COALESCE(eb.hubspot_contact_id, c.hubspot_contact_id) as hubspot_id,
    COALESCE(eb.business_name, c.business_name) as business_name,
    c.name as client_name,
    eb.phone,
    eb.email,
    eb.website,
    eb.street_address,
    eb.city,
    eb.state,
    eb.zip_code,
    eb.short_description,
    eb.long_description,
    eb.categories,
    eb.business_hours,
    eb.logo,
    c.created_at,
    COALESCE(eb.updated_at, c.created_at) as updated_at
FROM clients c
LEFT JOIN enriched_businesses eb ON c.hubspot_contact_id = eb.hubspot_contact_id;

-- View: citation_locations
-- Purpose: BrightLocal citation building locations
-- More descriptive name for directory submissions
CREATE OR REPLACE VIEW citation_locations AS
SELECT
    id,
    hubspot_contact_id as hubspot_id,
    brightlocal_location_id as location_id,
    business_name,
    address,
    city,
    state,
    postcode as zip_code,
    telephone as phone,
    url as website,
    description,
    primary_category_id as category_id,
    status,
    created_at,
    updated_at
FROM brightlocal_locations;

-- View: citation_campaigns
-- Purpose: BrightLocal citation building campaigns
-- Groups with citation_locations for clarity
CREATE OR REPLACE VIEW citation_campaigns AS
SELECT
    id,
    brightlocal_campaign_id as campaign_id,
    brightlocal_location_id as location_id,
    campaign_name as name,
    campaign_status as status,
    white_label_profile_url as profile_url,
    created_at,
    updated_at
FROM brightlocal_campaigns;

-- View: sync_history
-- Purpose: All sync operation logs in one place
-- Consolidates different sync log tables
CREATE OR REPLACE VIEW sync_history AS
SELECT
    id,
    'customer_sync' as sync_type,
    status,
    contacts_synced as records_processed,
    error_message as error,
    sync_started_at as started_at,
    sync_completed_at as completed_at
FROM customer_sync_logs
UNION ALL
SELECT
    id,
    log_type as sync_type,
    status,
    NULL as records_processed,
    message as error,
    created_at as started_at,
    created_at as completed_at
FROM sync_logs;

-- ============================================================================
-- PHASE 3: Add Table Comments for Documentation
-- Helps users understand table purposes when querying
-- ============================================================================

COMMENT ON TABLE contacts IS 'HubSpot CRM contacts - all leads, customers, and opportunities synced from HubSpot. Use lifecycle_stage to filter (Customer, Lead, etc.)';
COMMENT ON TABLE clients IS 'Agency clients - businesses we actively manage for directory services (only 3 total)';
COMMENT ON TABLE enriched_businesses IS 'Master business data enriched from multiple sources for directory submissions';
COMMENT ON TABLE pipedream_connected_accounts IS 'Google account OAuth connections for GBP access (use google_accounts view for cleaner access)';
COMMENT ON TABLE brightlocal_locations IS 'BrightLocal citation builder locations (use citation_locations view)';
COMMENT ON TABLE brightlocal_campaigns IS 'BrightLocal citation campaigns (use citation_campaigns view)';
COMMENT ON TABLE sync_logs IS 'General sync operation logs';
COMMENT ON TABLE customer_sync_logs IS 'Customer sync transaction logs';
COMMENT ON TABLE places_search_cache IS 'Google Places API search result cache';
COMMENT ON TABLE signup_email_domains IS 'Allowed email domains for user signup';

-- ============================================================================
-- PHASE 4: Add View Comments
-- ============================================================================

COMMENT ON VIEW crm_contacts IS 'User-friendly view of HubSpot CRM contacts with normalized column names';
COMMENT ON VIEW google_accounts IS 'Connected Google accounts for GBP access (hides Pipedream implementation)';
COMMENT ON VIEW managed_businesses IS 'All businesses we manage - combines clients with enriched business data';
COMMENT ON VIEW citation_locations IS 'BrightLocal citation locations with cleaner column names';
COMMENT ON VIEW citation_campaigns IS 'BrightLocal citation campaigns with cleaner column names';
COMMENT ON VIEW sync_history IS 'Unified view of all sync operations across different log tables';
