-- ============================================================================
-- Transaction Log Table Migration
-- ============================================================================
-- Purpose: Track all HubSpot <-> Supabase dual-write transactions
-- Created: 2025-11-18
-- Idempotent: Yes - Can be run multiple times safely
-- ============================================================================

-- ============================================================================
-- STEP 1: Create transaction_log table (IDEMPOTENT)
-- ============================================================================

CREATE TABLE IF NOT EXISTS transaction_log (
  -- Primary Identifier
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Transaction Context
  contact_id TEXT NOT NULL,                    -- HubSpot contact ID (numeric as TEXT)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- User who initiated (nullable for system ops)
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),

  -- Transaction Status Flags
  hubspot_updated BOOLEAN NOT NULL DEFAULT false,
  supabase_updated BOOLEAN NOT NULL DEFAULT false,
  rolled_back BOOLEAN NOT NULL DEFAULT false,
  critical_error BOOLEAN NOT NULL DEFAULT false,  -- True if rollback failed (data inconsistency)

  -- Error Information
  error_message TEXT,                          -- Error details if transaction failed
  error_details JSONB,                         -- Structured error info (stack traces, etc.)

  -- Data Tracking
  properties_changed JSONB,                    -- Properties that were modified
  previous_state JSONB,                        -- HubSpot state before update (for rollback)
  new_state JSONB,                             -- Intended new state

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_ms INTEGER,                         -- Transaction duration in milliseconds

  -- Request Context (helpful for debugging)
  ip_address INET,                             -- Client IP address
  user_agent TEXT,                             -- User agent string
  request_id TEXT                              -- Unique request identifier
);

-- ============================================================================
-- STEP 2: Add table comment (IDEMPOTENT)
-- ============================================================================

COMMENT ON TABLE transaction_log IS 'Audit log for all HubSpot <-> Supabase dual-write transactions. Tracks success, failures, and rollbacks for data integrity monitoring.';

-- ============================================================================
-- STEP 3: Add column comments (IDEMPOTENT)
-- ============================================================================

COMMENT ON COLUMN transaction_log.id IS 'Unique transaction log entry identifier';
COMMENT ON COLUMN transaction_log.contact_id IS 'HubSpot contact ID (stored as TEXT because HubSpot uses numeric IDs)';
COMMENT ON COLUMN transaction_log.user_id IS 'User who initiated the transaction (NULL for system operations)';
COMMENT ON COLUMN transaction_log.operation IS 'Type of operation: create, update, or delete';
COMMENT ON COLUMN transaction_log.hubspot_updated IS 'Whether HubSpot was successfully updated';
COMMENT ON COLUMN transaction_log.supabase_updated IS 'Whether Supabase was successfully updated';
COMMENT ON COLUMN transaction_log.rolled_back IS 'Whether HubSpot changes were rolled back due to Supabase failure';
COMMENT ON COLUMN transaction_log.critical_error IS 'TRUE if rollback failed - indicates data inconsistency requiring manual intervention';
COMMENT ON COLUMN transaction_log.error_message IS 'Human-readable error message if transaction failed';
COMMENT ON COLUMN transaction_log.error_details IS 'Structured error details (stack traces, error codes, etc.)';
COMMENT ON COLUMN transaction_log.properties_changed IS 'JSONB object containing the properties that were changed';
COMMENT ON COLUMN transaction_log.previous_state IS 'HubSpot property state before update (used for rollback)';
COMMENT ON COLUMN transaction_log.new_state IS 'Intended new property state after update';
COMMENT ON COLUMN transaction_log.created_at IS 'Timestamp when transaction was initiated';
COMMENT ON COLUMN transaction_log.duration_ms IS 'Transaction duration in milliseconds';
COMMENT ON COLUMN transaction_log.ip_address IS 'Client IP address (for audit purposes)';
COMMENT ON COLUMN transaction_log.user_agent IS 'Client user agent string';
COMMENT ON COLUMN transaction_log.request_id IS 'Unique request identifier for correlation';

-- ============================================================================
-- STEP 4: Create indexes for performance (IDEMPOTENT)
-- ============================================================================

-- Index for looking up transactions by contact ID
CREATE INDEX IF NOT EXISTS idx_transaction_log_contact_id
  ON transaction_log(contact_id);

-- Index for looking up transactions by user
CREATE INDEX IF NOT EXISTS idx_transaction_log_user_id
  ON transaction_log(user_id)
  WHERE user_id IS NOT NULL;

-- Index for time-based queries (most recent first)
CREATE INDEX IF NOT EXISTS idx_transaction_log_created_at
  ON transaction_log(created_at DESC);

-- Composite index for recent transactions per contact
CREATE INDEX IF NOT EXISTS idx_transaction_log_contact_created
  ON transaction_log(contact_id, created_at DESC);

-- Index for finding failed transactions
CREATE INDEX IF NOT EXISTS idx_transaction_log_failures
  ON transaction_log(created_at DESC)
  WHERE hubspot_updated = false OR supabase_updated = false;

-- Index for finding critical errors (data inconsistencies)
CREATE INDEX IF NOT EXISTS idx_transaction_log_critical_errors
  ON transaction_log(created_at DESC)
  WHERE critical_error = true;

-- Index for finding rolled back transactions
CREATE INDEX IF NOT EXISTS idx_transaction_log_rollbacks
  ON transaction_log(created_at DESC)
  WHERE rolled_back = true;

-- ============================================================================
-- STEP 5: Enable Row Level Security (IDEMPOTENT)
-- ============================================================================

ALTER TABLE transaction_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 6: Create RLS policies (IDEMPOTENT)
-- ============================================================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view their own transaction logs" ON transaction_log;
DROP POLICY IF EXISTS "Service role has full access to transaction logs" ON transaction_log;

-- Policy: Users can view their own transaction logs
CREATE POLICY "Users can view their own transaction logs"
  ON transaction_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role has full access (for admin operations and system logging)
CREATE POLICY "Service role has full access to transaction logs"
  ON transaction_log
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- STEP 7: Create helper function for logging transactions (IDEMPOTENT)
-- ============================================================================

CREATE OR REPLACE FUNCTION log_transaction(
  p_contact_id TEXT,
  p_user_id UUID,
  p_operation TEXT,
  p_hubspot_updated BOOLEAN,
  p_supabase_updated BOOLEAN,
  p_rolled_back BOOLEAN,
  p_critical_error BOOLEAN DEFAULT false,
  p_error_message TEXT DEFAULT NULL,
  p_error_details JSONB DEFAULT NULL,
  p_properties_changed JSONB DEFAULT NULL,
  p_previous_state JSONB DEFAULT NULL,
  p_new_state JSONB DEFAULT NULL,
  p_duration_ms INTEGER DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_request_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO transaction_log (
    contact_id,
    user_id,
    operation,
    hubspot_updated,
    supabase_updated,
    rolled_back,
    critical_error,
    error_message,
    error_details,
    properties_changed,
    previous_state,
    new_state,
    duration_ms,
    ip_address,
    user_agent,
    request_id
  ) VALUES (
    p_contact_id,
    p_user_id,
    p_operation,
    p_hubspot_updated,
    p_supabase_updated,
    p_rolled_back,
    p_critical_error,
    p_error_message,
    p_error_details,
    p_properties_changed,
    p_previous_state,
    p_new_state,
    p_duration_ms,
    p_ip_address,
    p_user_agent,
    p_request_id
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION log_transaction IS 'Helper function to insert transaction log entries. Returns the log entry ID.';

-- ============================================================================
-- STEP 8: Create view for critical errors (IDEMPOTENT)
-- ============================================================================

CREATE OR REPLACE VIEW transaction_log_critical_errors AS
SELECT
  id,
  contact_id,
  user_id,
  operation,
  error_message,
  error_details,
  properties_changed,
  created_at,
  duration_ms
FROM transaction_log
WHERE critical_error = true
ORDER BY created_at DESC;

COMMENT ON VIEW transaction_log_critical_errors IS 'View showing only critical errors (rollback failures) requiring manual intervention';

-- ============================================================================
-- STEP 9: Create view for transaction success rates (IDEMPOTENT)
-- ============================================================================

CREATE OR REPLACE VIEW transaction_log_stats AS
SELECT
  DATE_TRUNC('hour', created_at) AS hour,
  COUNT(*) AS total_transactions,
  COUNT(*) FILTER (WHERE hubspot_updated AND supabase_updated) AS successful_transactions,
  COUNT(*) FILTER (WHERE rolled_back) AS rolled_back_transactions,
  COUNT(*) FILTER (WHERE critical_error) AS critical_errors,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE hubspot_updated AND supabase_updated) / COUNT(*),
    2
  ) AS success_rate_percent,
  AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) AS avg_duration_ms
FROM transaction_log
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

COMMENT ON VIEW transaction_log_stats IS 'Hourly statistics for transaction success rates and performance';

-- ============================================================================
-- STEP 10: Grant permissions (IDEMPOTENT)
-- ============================================================================

-- Grant SELECT to authenticated users (they can view their own logs via RLS)
GRANT SELECT ON transaction_log TO authenticated;

-- Grant SELECT on views to authenticated users
GRANT SELECT ON transaction_log_critical_errors TO authenticated;
GRANT SELECT ON transaction_log_stats TO authenticated;

-- Grant EXECUTE on log_transaction function to service_role
GRANT EXECUTE ON FUNCTION log_transaction TO service_role;
GRANT EXECUTE ON FUNCTION log_transaction TO authenticated;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- The transaction_log table is now ready to use.
--
-- Usage Example:
-- SELECT log_transaction(
--   p_contact_id := '12345',
--   p_user_id := auth.uid(),
--   p_operation := 'update',
--   p_hubspot_updated := true,
--   p_supabase_updated := true,
--   p_rolled_back := false,
--   p_properties_changed := '{"firstname": "John", "lastname": "Doe"}'::jsonb,
--   p_duration_ms := 1234
-- );
-- ============================================================================
