/**
 * Drop Companies Table
 *
 * The companies table was created in error. The Zing app uses the contacts table
 * to store HubSpot contacts (with lifecyclestage='customer') which represent businesses.
 *
 * Date: November 18, 2025
 */

-- Drop the companies table and all related objects
DROP TABLE IF EXISTS public.companies CASCADE;

-- Drop any related indexes (CASCADE should handle this, but being explicit)
DROP INDEX IF EXISTS public.idx_companies_hubspot_contact_id;
DROP INDEX IF EXISTS public.idx_companies_name;
DROP INDEX IF EXISTS public.idx_companies_status;

-- Drop any related functions (CASCADE should handle this)
DROP FUNCTION IF EXISTS public.update_companies_updated_at() CASCADE;

-- Confirm deletion
COMMENT ON SCHEMA public IS 'Companies table removed - using contacts table instead';
