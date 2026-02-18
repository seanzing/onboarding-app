/**
 * Migration: Rename hubspot_company_id to hubspot_contact_id across all tables
 *
 * This migration switches from company-centric to contact-centric linking.
 * Each HubSpot contact (with lifecyclestage='customer') is treated as a business
 * and identified by their contact ID (hs_object_id).
 *
 * Date: November 18, 2025
 * Reason: HubSpot contacts (customers) should be the universal identifier,
 *         not companies. Each contact has their own integrations.
 */

-- ============================================================================
-- STEP 1: Rename columns in all tables
-- ============================================================================

-- clients table: Rename hubspot_company_id to hubspot_contact_id
ALTER TABLE public.clients
  RENAME COLUMN hubspot_company_id TO hubspot_contact_id;

-- contacts table: Rename hubspot_company_id to hubspot_contact_id
ALTER TABLE public.contacts
  RENAME COLUMN hubspot_company_id TO hubspot_contact_id;

-- brightlocal_locations table: Rename hubspot_company_id to hubspot_contact_id
ALTER TABLE public.brightlocal_locations
  RENAME COLUMN hubspot_company_id TO hubspot_contact_id;

-- brightlocal_campaigns table: Rename hubspot_company_id to hubspot_contact_id
ALTER TABLE public.brightlocal_campaigns
  RENAME COLUMN hubspot_company_id TO hubspot_contact_id;

-- gbp_locations table: Rename hubspot_company_id to hubspot_contact_id
ALTER TABLE public.gbp_locations
  RENAME COLUMN hubspot_company_id TO hubspot_contact_id;

-- ============================================================================
-- STEP 2: Backfill contacts table - Copy hs_object_id to hubspot_contact_id
-- ============================================================================

-- Every contact already has hs_object_id (their HubSpot contact ID)
-- Copy it to the hubspot_contact_id column for consistency
UPDATE public.contacts
SET hubspot_contact_id = hs_object_id
WHERE hubspot_contact_id IS NULL OR hubspot_contact_id != hs_object_id;

-- ============================================================================
-- STEP 3: Make contacts.hubspot_contact_id NOT NULL
-- ============================================================================

-- Since every contact has an hs_object_id, hubspot_contact_id should never be NULL
ALTER TABLE public.contacts
  ALTER COLUMN hubspot_contact_id SET NOT NULL;

-- ============================================================================
-- STEP 4: Rename indexes (drop old, create new)
-- ============================================================================

-- clients table index
DROP INDEX IF EXISTS public.clients_hubspot_company_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS clients_hubspot_contact_id_key
  ON public.clients(hubspot_contact_id);

-- contacts table index
DROP INDEX IF EXISTS public.idx_contacts_hubspot_company_id;
CREATE INDEX IF NOT EXISTS idx_contacts_hubspot_contact_id
  ON public.contacts(hubspot_contact_id);

-- brightlocal_locations table index
DROP INDEX IF EXISTS public.idx_brightlocal_locations_hubspot_id;
CREATE INDEX IF NOT EXISTS idx_brightlocal_locations_hubspot_contact_id
  ON public.brightlocal_locations(hubspot_contact_id);

-- brightlocal_campaigns table index
DROP INDEX IF EXISTS public.idx_brightlocal_campaigns_hubspot_id;
CREATE INDEX IF NOT EXISTS idx_brightlocal_campaigns_hubspot_contact_id
  ON public.brightlocal_campaigns(hubspot_contact_id);

-- gbp_locations table index
DROP INDEX IF EXISTS public.idx_gbp_locations_hubspot_id;
CREATE INDEX IF NOT EXISTS idx_gbp_locations_hubspot_contact_id
  ON public.gbp_locations(hubspot_contact_id);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

/**
 * What changed:
 *
 * BEFORE:
 * - All tables used hubspot_company_id as the universal identifier
 * - Required fetching company associations from HubSpot
 * - Many contacts had NULL hubspot_company_id (not associated with companies)
 *
 * AFTER:
 * - All tables use hubspot_contact_id as the universal identifier
 * - Uses contact's hs_object_id directly (always available)
 * - No NULL values - every contact has an ID
 * - Simpler data model - no company associations needed
 *
 * Impact:
 * - Each HubSpot contact (customer) has their own integrations
 * - GBP accounts, BrightLocal locations, etc. link to specific contacts
 * - More granular control per contact/business
 */
