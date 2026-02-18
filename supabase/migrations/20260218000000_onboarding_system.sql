-- Onboarding System Migration
-- Adds tables for unified onboarding dashboard across 4 services:
-- Foursquare, Chatbot, SEO Blogs, and Geo-targeted Landing Pages

-- 1. Add duda_site_code to contacts table (links to blog/landing page services)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS duda_site_code TEXT;

-- 2. Service Identity Map - maps HubSpot contacts to external service identifiers
CREATE TABLE IF NOT EXISTS service_identity_map (
  hubspot_contact_id TEXT PRIMARY KEY,
  duda_site_code TEXT,
  chatbot_slug TEXT,
  foursquare_venue_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE service_identity_map IS 'Maps HubSpot contacts to their identifiers across external services';
COMMENT ON COLUMN service_identity_map.duda_site_code IS 'Duda site code used by Blog and Landing Pages services';
COMMENT ON COLUMN service_identity_map.chatbot_slug IS 'Slug identifier for the AI chatbot service';
COMMENT ON COLUMN service_identity_map.foursquare_venue_id IS 'Foursquare venue ID after listing is created/claimed';

-- 3. Onboarding Status - tracks per-service provisioning state
CREATE TABLE IF NOT EXISTS onboarding_status (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  hubspot_contact_id TEXT NOT NULL,
  service TEXT NOT NULL CHECK (service IN ('chatbot', 'blogs', 'landing_pages', 'foursquare')),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'pending', 'active', 'error', 'paused')),
  metadata JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  provisioned_at TIMESTAMPTZ,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (hubspot_contact_id, service)
);

COMMENT ON TABLE onboarding_status IS 'Tracks onboarding status for each service per customer';

-- Index for fast lookups by contact
CREATE INDEX IF NOT EXISTS idx_onboarding_status_contact ON onboarding_status (hubspot_contact_id);

-- 4. Auto-update updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_service_identity_map_updated_at ON service_identity_map;
CREATE TRIGGER update_service_identity_map_updated_at
  BEFORE UPDATE ON service_identity_map
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_onboarding_status_updated_at ON onboarding_status;
CREATE TRIGGER update_onboarding_status_updated_at
  BEFORE UPDATE ON onboarding_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Customer onboarding view - joins contacts, identity map, and aggregated status
CREATE OR REPLACE VIEW v_customer_onboarding AS
SELECT
  c.id AS contact_uuid,
  c.hs_object_id AS hubspot_contact_id,
  c.properties->>'firstname' AS first_name,
  c.properties->>'lastname' AS last_name,
  c.properties->>'company' AS company_name,
  c.properties->>'email' AS email,
  c.properties->>'website' AS website,
  sim.duda_site_code,
  sim.chatbot_slug,
  sim.foursquare_venue_id,
  -- Aggregated service statuses
  (SELECT status FROM onboarding_status os WHERE os.hubspot_contact_id = c.hs_object_id AND os.service = 'chatbot') AS chatbot_status,
  (SELECT status FROM onboarding_status os WHERE os.hubspot_contact_id = c.hs_object_id AND os.service = 'blogs') AS blogs_status,
  (SELECT status FROM onboarding_status os WHERE os.hubspot_contact_id = c.hs_object_id AND os.service = 'landing_pages') AS landing_pages_status,
  (SELECT status FROM onboarding_status os WHERE os.hubspot_contact_id = c.hs_object_id AND os.service = 'foursquare') AS foursquare_status,
  -- Count active services
  (SELECT COUNT(*) FROM onboarding_status os WHERE os.hubspot_contact_id = c.hs_object_id AND os.status = 'active') AS active_services_count,
  (SELECT COUNT(*) FROM onboarding_status os WHERE os.hubspot_contact_id = c.hs_object_id AND os.status != 'not_started') AS provisioned_services_count
FROM contacts c
LEFT JOIN service_identity_map sim ON sim.hubspot_contact_id = c.hs_object_id;

COMMENT ON VIEW v_customer_onboarding IS 'Unified view of customer onboarding status across all services';

-- 6. Enable RLS on new tables
ALTER TABLE service_identity_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_status ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (agency staff)
CREATE POLICY "Authenticated users can manage service identities"
  ON service_identity_map FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage onboarding status"
  ON onboarding_status FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
