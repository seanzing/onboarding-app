-- ============================================================================
-- Migration: Create enriched_businesses Table
-- ============================================================================
--
-- Purpose: Store enriched business data from HubSpot customers for directory
--          submissions (BrightLocal, GBP, Yelp, etc.)
--
-- This table serves as the "master record" for business information that has
-- been enriched from multiple sources (HubSpot, company websites, social media,
-- Google Business Profile, etc.)
--
-- Key Design Decisions:
--   1. Uses hubspot_contact_id as the universal identifier (matching contacts table)
--   2. JSONB fields for flexible nested structures (hours, social, attributes)
--   3. Separate from brightlocal_locations to maintain clean separation:
--      - enriched_businesses = What we WANT to submit (master data)
--      - brightlocal_locations = What BrightLocal HAS (API sync records)
--   4. Includes brightlocal_category_id for direct CSV bulk import
--
-- Author: Claude Code
-- Date: 2025-11-28
-- Idempotent: YES - Safe to run multiple times
--
-- ============================================================================

-- ============================================================================
-- STEP 1: Create the enriched_businesses table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.enriched_businesses (
  -- =========================================================================
  -- Primary Key
  -- =========================================================================
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- =========================================================================
  -- HubSpot Linkage (Universal Identifier)
  -- =========================================================================
  -- This is the CRITICAL field that links to all other tables
  -- Uses hubspot_contact_id (NOT company_id) per migration 20251118060000
  hubspot_contact_id TEXT UNIQUE NOT NULL,
  hubspot_url TEXT,

  -- =========================================================================
  -- Business Identity
  -- =========================================================================
  business_name TEXT NOT NULL,
  business_name_alternate TEXT,  -- DBA name, trade name, etc.

  -- =========================================================================
  -- Contact Information
  -- =========================================================================
  phone TEXT,
  phone_secondary TEXT,
  email TEXT,
  website TEXT,

  -- =========================================================================
  -- Address Fields
  -- =========================================================================
  street_address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'United States',
  service_area TEXT,  -- Geographic description of service area

  -- =========================================================================
  -- Business Descriptions
  -- =========================================================================
  -- short_description: ~150 chars for directory snippets
  -- long_description: Full description for detailed listings
  short_description TEXT,
  long_description TEXT,

  -- =========================================================================
  -- Categories
  -- =========================================================================
  -- categories: Array of category strings (e.g., ["Plumber", "Contractor"])
  -- brightlocal_category_id: BrightLocal's internal category ID for bulk import
  categories TEXT[] DEFAULT ARRAY[]::TEXT[],
  brightlocal_category_id INTEGER,

  -- =========================================================================
  -- Business Hours (JSONB)
  -- =========================================================================
  -- Structure:
  -- {
  --   "monday": "9:00 AM - 5:00 PM",
  --   "tuesday": "9:00 AM - 5:00 PM",
  --   ...
  --   "sunday": "Closed"
  -- }
  business_hours JSONB DEFAULT '{}'::jsonb,

  -- =========================================================================
  -- Images
  -- =========================================================================
  logo TEXT,                          -- Path to logo file
  images TEXT[] DEFAULT ARRAY[]::TEXT[],  -- Array of image paths
  images_note TEXT,                   -- Notes about image requirements

  -- =========================================================================
  -- Social Media (JSONB)
  -- =========================================================================
  -- Structure:
  -- {
  --   "facebook": "https://facebook.com/...",
  --   "instagram": "https://instagram.com/...",
  --   "twitter": null,
  --   "linkedin": "https://linkedin.com/...",
  --   "yelp": "https://yelp.com/...",
  --   "tiktok": null
  -- }
  social_media JSONB DEFAULT '{}'::jsonb,

  -- =========================================================================
  -- Business Attributes (JSONB)
  -- =========================================================================
  -- Structure:
  -- {
  --   "languages": ["English", "Spanish"],
  --   "paymentMethods": ["Cash", "Visa", "Mastercard"],
  --   "accessibility": "Wheelchair Accessible",
  --   "parking": "Free parking available",
  --   "yearsInBusiness": "35+ (Founded 1988)",
  --   "license": "Licensed and Insured"
  -- }
  attributes JSONB DEFAULT '{}'::jsonb,

  -- =========================================================================
  -- Services & Certifications
  -- =========================================================================
  services TEXT[] DEFAULT ARRAY[]::TEXT[],
  certifications TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- =========================================================================
  -- Notes
  -- =========================================================================
  notes TEXT,

  -- =========================================================================
  -- Enrichment Metadata
  -- =========================================================================
  -- Tracks when and how the data was enriched
  enrichment_date DATE,
  enrichment_sources TEXT[] DEFAULT ARRAY[]::TEXT[],
  data_source TEXT,

  -- =========================================================================
  -- System Fields
  -- =========================================================================
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: Create Indexes for Performance
-- ============================================================================

-- Primary lookup index (CRITICAL - most queries will use this)
CREATE UNIQUE INDEX IF NOT EXISTS idx_enriched_businesses_hubspot_contact_id
  ON public.enriched_businesses(hubspot_contact_id);

-- Business name search index
CREATE INDEX IF NOT EXISTS idx_enriched_businesses_business_name
  ON public.enriched_businesses(business_name);

-- BrightLocal category lookup (for filtering by category)
CREATE INDEX IF NOT EXISTS idx_enriched_businesses_brightlocal_category
  ON public.enriched_businesses(brightlocal_category_id)
  WHERE brightlocal_category_id IS NOT NULL;

-- City index (for geographic queries)
CREATE INDEX IF NOT EXISTS idx_enriched_businesses_city
  ON public.enriched_businesses(city);

-- State index (for geographic queries)
CREATE INDEX IF NOT EXISTS idx_enriched_businesses_state
  ON public.enriched_businesses(state);

-- Created at index (for sorting by newest)
CREATE INDEX IF NOT EXISTS idx_enriched_businesses_created_at
  ON public.enriched_businesses(created_at DESC);

-- Enrichment date index (for filtering by freshness)
CREATE INDEX IF NOT EXISTS idx_enriched_businesses_enrichment_date
  ON public.enriched_businesses(enrichment_date DESC)
  WHERE enrichment_date IS NOT NULL;

-- ============================================================================
-- STEP 3: Create updated_at Trigger Function (if not exists)
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_enriched_businesses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 4: Create Trigger for updated_at
-- ============================================================================

-- Drop trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS trigger_enriched_businesses_updated_at
  ON public.enriched_businesses;

-- Create trigger
CREATE TRIGGER trigger_enriched_businesses_updated_at
  BEFORE UPDATE ON public.enriched_businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_enriched_businesses_updated_at();

-- ============================================================================
-- STEP 5: Add Table and Column Comments
-- ============================================================================

COMMENT ON TABLE public.enriched_businesses IS
  'Master record of enriched business data from HubSpot customers. Used for directory submissions (BrightLocal, GBP, etc.). Links to contacts table via hubspot_contact_id.';

COMMENT ON COLUMN public.enriched_businesses.hubspot_contact_id IS
  'HubSpot contact ID (hs_object_id) - Universal identifier linking all integration tables. NOT NULL and UNIQUE.';

COMMENT ON COLUMN public.enriched_businesses.hubspot_url IS
  'Direct link to HubSpot contact record for easy reference.';

COMMENT ON COLUMN public.enriched_businesses.business_name IS
  'Primary business name as it should appear in directory listings.';

COMMENT ON COLUMN public.enriched_businesses.business_name_alternate IS
  'DBA (Doing Business As) name, trade name, or alternate name.';

COMMENT ON COLUMN public.enriched_businesses.short_description IS
  'Brief business description (~150 characters) for directory snippets and previews.';

COMMENT ON COLUMN public.enriched_businesses.long_description IS
  'Full business description for detailed directory listings (500-1000 characters).';

COMMENT ON COLUMN public.enriched_businesses.categories IS
  'Array of business category strings (e.g., ["Plumber", "General Contractor"]).';

COMMENT ON COLUMN public.enriched_businesses.brightlocal_category_id IS
  'BrightLocal internal category ID for bulk CSV import. Found via BrightLocal Categories List.';

COMMENT ON COLUMN public.enriched_businesses.business_hours IS
  'JSONB object with day-of-week keys and hours strings. Example: {"monday": "9:00 AM - 5:00 PM", "saturday": "Closed"}';

COMMENT ON COLUMN public.enriched_businesses.social_media IS
  'JSONB object with social platform keys. Example: {"facebook": "https://...", "instagram": "https://...", "twitter": null}';

COMMENT ON COLUMN public.enriched_businesses.attributes IS
  'JSONB object with business attributes. Example: {"languages": ["English"], "paymentMethods": ["Visa", "Mastercard"], "yearsInBusiness": "35+"}';

COMMENT ON COLUMN public.enriched_businesses.services IS
  'Array of services offered by the business.';

COMMENT ON COLUMN public.enriched_businesses.certifications IS
  'Array of certifications, licenses, or accreditations.';

COMMENT ON COLUMN public.enriched_businesses.enrichment_date IS
  'Date when the business data was last enriched from external sources.';

COMMENT ON COLUMN public.enriched_businesses.enrichment_sources IS
  'Array of sources used to enrich the data (e.g., ["HubSpot CRM", "Google Business Profile", "Company Website"]).';

COMMENT ON COLUMN public.enriched_businesses.data_source IS
  'Primary data source descriptor (e.g., "hubspot + web enrichment").';

-- ============================================================================
-- STEP 6: Enable Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on the table
ALTER TABLE public.enriched_businesses ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for authenticated users (adjust as needed)
-- This is permissive - tighten based on your auth requirements
DROP POLICY IF EXISTS "Allow authenticated users full access to enriched_businesses"
  ON public.enriched_businesses;

CREATE POLICY "Allow authenticated users full access to enriched_businesses"
  ON public.enriched_businesses
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow service role full access (for server-side operations)
DROP POLICY IF EXISTS "Allow service role full access to enriched_businesses"
  ON public.enriched_businesses;

CREATE POLICY "Allow service role full access to enriched_businesses"
  ON public.enriched_businesses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- STEP 7: Grant Permissions
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

-- Grant table permissions
GRANT ALL ON public.enriched_businesses TO authenticated;
GRANT ALL ON public.enriched_businesses TO service_role;

-- ============================================================================
-- STEP 8: Verification
-- ============================================================================

DO $$
DECLARE
  table_exists BOOLEAN;
  column_count INTEGER;
  index_count INTEGER;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'enriched_businesses'
  ) INTO table_exists;

  -- Count columns
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = 'enriched_businesses';

  -- Count indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND tablename = 'enriched_businesses';

  RAISE NOTICE '';
  RAISE NOTICE '================================================================================';
  RAISE NOTICE 'MIGRATION COMPLETE: enriched_businesses table created';
  RAISE NOTICE '================================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Table exists: %', table_exists;
  RAISE NOTICE 'Column count: % (expected 29)', column_count;
  RAISE NOTICE 'Index count: % (expected 8)', index_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Run import script to load enriched JSON data';
  RAISE NOTICE '  2. Add brightlocal_category_id values for each business';
  RAISE NOTICE '  3. Verify data with: SELECT * FROM enriched_businesses;';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- Sample Queries (for reference - do not execute during migration)
-- ============================================================================

-- Insert example (for testing):
-- INSERT INTO enriched_businesses (
--   hubspot_contact_id, hubspot_url, business_name, business_name_alternate,
--   phone, email, website, street_address, city, state, zip_code, country,
--   service_area, short_description, long_description, categories,
--   brightlocal_category_id, business_hours, logo, images, social_media,
--   attributes, services, certifications, notes, enrichment_date,
--   enrichment_sources, data_source
-- ) VALUES (
--   '536151',
--   'https://app.hubspot.com/contacts/39784316/record/0-1/536151',
--   'In Design by Kristina',
--   'In Design by K',
--   '(309) 214-1477',
--   'indesignbykristina@gmail.com',
--   'https://www.indesignbykristina.com/',
--   '902 E Marietta Ave',
--   'Peoria Heights',
--   'Illinois',
--   '61616',
--   'United States',
--   'Central Illinois - Peoria, Springfield, Bloomington, Champaign',
--   'Creative photography & design studio specializing in weddings...',
--   'In Design by Kristina is a creative studio founded by Kristina Velpel...',
--   ARRAY['Photographer', 'Wedding Photographer', 'Graphic Designer'],
--   896,  -- BrightLocal category ID for Wedding Photographer
--   '{"monday": "9:00 AM - 12:00 AM", "tuesday": "9:00 AM - 12:00 AM"}'::jsonb,
--   'public/images/brightlocal/in-design-kristina/logo.png',
--   ARRAY['public/images/brightlocal/in-design-kristina/wedding-primary1.jpg'],
--   '{"facebook": "https://facebook.com/...", "instagram": "https://instagram.com/..."}'::jsonb,
--   '{"languages": ["English"], "paymentMethods": ["Cash", "Visa"]}'::jsonb,
--   ARRAY['Wedding Photography', 'Engagement Sessions', 'Portrait Sessions'],
--   ARRAY[]::TEXT[],
--   NULL,
--   '2025-11-28'::date,
--   ARRAY['HubSpot CRM', 'indesignbykristina.com', 'Google Business Profile'],
--   'hubspot + web enrichment'
-- );

-- Query by HubSpot contact ID:
-- SELECT * FROM enriched_businesses WHERE hubspot_contact_id = '536151';

-- Query by category:
-- SELECT business_name, categories FROM enriched_businesses
-- WHERE brightlocal_category_id = 896;

-- Query with JSONB extraction:
-- SELECT
--   business_name,
--   business_hours->>'monday' as monday_hours,
--   social_media->>'facebook' as facebook_url
-- FROM enriched_businesses;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
