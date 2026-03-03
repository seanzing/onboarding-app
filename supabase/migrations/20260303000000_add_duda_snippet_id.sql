-- Add duda_snippet_id column to track deployed widget snippets
ALTER TABLE service_identity_map
ADD COLUMN IF NOT EXISTS duda_snippet_id text;

COMMENT ON COLUMN service_identity_map.duda_snippet_id IS 'Duda injected snippet UUID for the chatbot widget';
