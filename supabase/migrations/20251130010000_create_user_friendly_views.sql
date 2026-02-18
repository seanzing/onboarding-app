-- ============================================================================
-- Create User-Friendly Database Views
-- Created: November 30, 2025
-- Purpose: Make the database more intuitive for natural language queries
-- Note: Ghost tables already deleted in previous migration
-- ============================================================================

-- ============================================================================
-- VIEWS for Natural Language Querying
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
-- Note: Uses hubspot_company_id because fix_brightlocal_schema.sql recreated table after rename
CREATE OR REPLACE VIEW citation_locations AS
SELECT
    id,
    hubspot_company_id as hubspot_id,
    brightlocal_location_id as location_id,
    business_name,
    address_line_1 as address,
    city,
    state_province as state,
    postal_code as zip_code,
    phone,
    website_url as website,
    primary_category,
    business_categories as categories,
    location_status as status,
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
    campaign_type as type,
    campaign_status as status,
    citations_built,
    citations_live,
    citations_pending,
    created_at,
    updated_at
FROM brightlocal_campaigns;

-- View: sync_history
-- Purpose: All sync operation logs in one place
-- Shows customer sync operations with meaningful metrics
CREATE OR REPLACE VIEW sync_history AS
SELECT
    id,
    sync_type,
    status,
    contacts_synced as records_processed,
    contacts_skipped,
    errors as error_count,
    error_message,
    triggered_by,
    duration_ms,
    created_at
FROM customer_sync_logs;

-- ============================================================================
-- TABLE COMMENTS for Documentation
-- Helps users understand table purposes when querying
-- ============================================================================

COMMENT ON TABLE contacts IS 'HubSpot CRM contacts - all leads, customers, and opportunities synced from HubSpot. Use lifecycle_stage to filter (Customer, Lead, etc.). ~133K records.';
COMMENT ON TABLE clients IS 'Agency clients - businesses we actively manage for directory services. Only 3 records. NOT the same as contacts.';
COMMENT ON TABLE enriched_businesses IS 'Master business data enriched from multiple sources for directory submissions. 11 records with complete business profiles.';
COMMENT ON TABLE pipedream_connected_accounts IS 'Google account OAuth connections for GBP access. Use google_accounts view for cleaner access.';
COMMENT ON TABLE brightlocal_locations IS 'BrightLocal citation builder locations. Use citation_locations view for cleaner access.';
COMMENT ON TABLE brightlocal_campaigns IS 'BrightLocal citation campaigns. Use citation_campaigns view for cleaner access.';
COMMENT ON TABLE sync_logs IS 'General sync operation logs. Use sync_history view for unified access.';
COMMENT ON TABLE customer_sync_logs IS 'Customer sync transaction logs. Use sync_history view for unified access.';
COMMENT ON TABLE places_search_cache IS 'Google Places API search result cache for deduplication.';
COMMENT ON TABLE signup_email_domains IS 'Allowed email domains for user signup (6 domains).';

-- ============================================================================
-- VIEW COMMENTS
-- ============================================================================

COMMENT ON VIEW crm_contacts IS 'User-friendly view of HubSpot CRM contacts. Query this for customer data. ~133K records.';
COMMENT ON VIEW google_accounts IS 'Connected Google accounts for GBP access. Hides Pipedream implementation detail.';
COMMENT ON VIEW managed_businesses IS 'Businesses we actively manage - combines clients with enriched business data. 11 records.';
COMMENT ON VIEW citation_locations IS 'BrightLocal citation locations with normalized column names. 11 records.';
COMMENT ON VIEW citation_campaigns IS 'BrightLocal citation campaigns with normalized column names.';
COMMENT ON VIEW sync_history IS 'HubSpot customer sync operation logs with metrics (records processed, skipped, errors, duration).';

-- ============================================================================
-- HELPFUL ALIASES for Common Queries
-- ============================================================================

-- Quick helper: Customers only (most common query)
CREATE OR REPLACE VIEW customers AS
SELECT * FROM crm_contacts WHERE lifecycle_stage = 'Customer';

COMMENT ON VIEW customers IS 'Shortcut to get only Customer contacts from HubSpot CRM. Most common query.';
