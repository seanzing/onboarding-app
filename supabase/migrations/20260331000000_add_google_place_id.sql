-- Add google_place_id to service_identity_map
-- Links HubSpot contacts to their Google Places API place ID
-- Used to pull rich business data (lat/lng, hours, categories) for directory submissions

ALTER TABLE service_identity_map
ADD COLUMN IF NOT EXISTS google_place_id TEXT;

COMMENT ON COLUMN service_identity_map.google_place_id IS 'Google Places API place ID for pulling public business data (hours, lat/lng, categories)';

-- Update the v_customer_onboarding view to include google_place_id
-- Must DROP first because CREATE OR REPLACE cannot rename existing columns
DROP VIEW IF EXISTS v_customer_onboarding;

CREATE VIEW v_customer_onboarding AS
SELECT
  c.id AS contact_uuid,
  c.hs_object_id AS hubspot_contact_id,
  c.company,
  c.firstname,
  c.lastname,
  c.email,
  c.lifecyclestage,
  sim.duda_site_code,
  sim.chatbot_slug,
  sim.foursquare_venue_id,
  sim.google_place_id,
  (SELECT status FROM onboarding_status os WHERE os.hubspot_contact_id = c.hs_object_id AND os.service = 'chatbot') AS chatbot_status,
  (SELECT status FROM onboarding_status os WHERE os.hubspot_contact_id = c.hs_object_id AND os.service = 'blogs') AS blogs_status,
  (SELECT status FROM onboarding_status os WHERE os.hubspot_contact_id = c.hs_object_id AND os.service = 'landing_pages') AS landing_pages_status,
  (SELECT status FROM onboarding_status os WHERE os.hubspot_contact_id = c.hs_object_id AND os.service = 'foursquare') AS foursquare_status,
  (SELECT COUNT(*) FROM onboarding_status os WHERE os.hubspot_contact_id = c.hs_object_id AND os.status = 'active') AS active_services_count,
  (SELECT COUNT(*) FROM onboarding_status os WHERE os.hubspot_contact_id = c.hs_object_id AND os.status != 'not_started') AS provisioned_services_count
FROM contacts c
LEFT JOIN service_identity_map sim ON sim.hubspot_contact_id = c.hs_object_id;
