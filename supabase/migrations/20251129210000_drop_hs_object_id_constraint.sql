-- Drop redundant UNIQUE constraint on hs_object_id
-- This constraint causes sync failures when HubSpot pagination returns duplicates.
-- We already have UNIQUE(hubspot_contact_id, user_id) which serves the same purpose
-- since hs_object_id and hubspot_contact_id contain the same HubSpot ID value.

ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_hs_object_id_key;

-- Verify the constraint is dropped by showing remaining constraints
-- SELECT conname FROM pg_constraint WHERE conrelid = 'contacts'::regclass;
