-- Simplify gbp_connections table
-- Remove token storage since Pipedream handles all token management
--
-- Migration: 20251125_simplify_gbp_connections
--
-- IMPORTANT: Before running this migration, ensure all connections
-- have a valid pipedream_account_id, as tokens will no longer be stored locally.

-- Step 1: Add pipedream_external_user_id column if not exists
ALTER TABLE gbp_connections
ADD COLUMN IF NOT EXISTS pipedream_external_user_id TEXT;

-- Step 2: Make pipedream_account_id required for new connections
-- (Don't alter existing NULL values yet - handle in application code)
COMMENT ON COLUMN gbp_connections.pipedream_account_id IS
  'Required: Pipedream account ID for this OAuth connection. Pipedream manages all tokens.';

COMMENT ON COLUMN gbp_connections.pipedream_external_user_id IS
  'External user ID used when creating the Pipedream connection. Used for SDK calls.';

-- Step 3: Remove token columns (they are now managed by Pipedream)
-- WARNING: This permanently removes any stored tokens!
ALTER TABLE gbp_connections DROP COLUMN IF EXISTS access_token;
ALTER TABLE gbp_connections DROP COLUMN IF EXISTS refresh_token;
ALTER TABLE gbp_connections DROP COLUMN IF EXISTS token_expires_at;

-- Step 4: Add index on pipedream_account_id for lookups
CREATE INDEX IF NOT EXISTS idx_gbp_connections_pipedream_account
ON gbp_connections(pipedream_account_id);

-- Summary of new schema:
-- gbp_connections now only stores:
--   - id (UUID)
--   - client_id (FK to gbp_clients)
--   - google_email (the connected Google account)
--   - pipedream_account_id (reference to Pipedream)
--   - pipedream_external_user_id (for SDK calls)
--   - connected_by (who connected it)
--   - created_at, updated_at

-- To get a token, use:
--   const token = await getGBPToken(pipedream_account_id, pipedream_external_user_id);
