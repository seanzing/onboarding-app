-- ============================================================================
-- MCP Read-Only Access for Contacts Table
-- Version: 2.0 (SECURITY DEFINER Approach)
-- Created: November 30, 2025
-- ============================================================================
--
-- PURPOSE: Grant secure, read-only access to the contacts table for MCP/AI
--
-- SECURITY MODEL:
-- 1. Dedicated schema (mcp_readonly) - complete isolation
-- 2. SECURITY DEFINER function - bypasses RLS safely
-- 3. VIEW wrapper - provides table-like interface
-- 4. NO access to public schema - prevents direct table queries
-- 5. Column filtering - excludes sensitive raw_properties JSONB
--
-- CONNECTION: Must use DIRECT connection (port 5432), NOT pooled (port 6543)
-- ============================================================================

-- ============================================================================
-- STEP 1: Create dedicated schema for MCP access
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS mcp_readonly;

COMMENT ON SCHEMA mcp_readonly IS 'Isolated schema for MCP/AI read-only access. Contains views that expose filtered data from main tables.';

-- ============================================================================
-- STEP 2: Create the read-only role
-- ============================================================================
-- Note: In Supabase, custom roles work with DIRECT connections only (port 5432)
-- The Supavisor pooler (port 6543) only supports built-in roles

DO $$
BEGIN
  -- Create role if it doesn't exist
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'mcp_readonly_user') THEN
    CREATE ROLE mcp_readonly_user WITH
      LOGIN
      PASSWORD 'G736EjgXM2_8mzdALgxmLBIP_jEnSwcy'
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOINHERIT;

    RAISE NOTICE 'Created role: mcp_readonly_user';
  ELSE
    -- Update password if role exists (ensures password is current)
    ALTER ROLE mcp_readonly_user WITH PASSWORD 'G736EjgXM2_8mzdALgxmLBIP_jEnSwcy';
    RAISE NOTICE 'Updated password for existing role: mcp_readonly_user';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Configure role's search_path for isolation
-- ============================================================================
-- This prevents the user from accidentally accessing public schema objects
ALTER ROLE mcp_readonly_user SET search_path TO mcp_readonly;

-- ============================================================================
-- STEP 4: Create SECURITY DEFINER function
-- ============================================================================
-- This function:
-- - Runs as the function owner (postgres) which bypasses RLS
-- - Returns ONLY the columns we want to expose
-- - Excludes sensitive columns (raw_properties, user_id, etc.)
-- - Uses SET search_path to prevent search_path hijacking attacks

CREATE OR REPLACE FUNCTION mcp_readonly.fn_get_contacts()
RETURNS TABLE (
    id TEXT,
    hubspot_id TEXT,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    company TEXT,
    lifecycle_stage TEXT,
    created_at TEXT,
    updated_at TEXT,
    synced_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE                          -- Function doesn't modify database
SECURITY DEFINER                -- Runs as function owner (bypasses RLS)
SET search_path = public        -- Prevent search_path hijacking
AS $$
    SELECT
        id,
        hs_object_id AS hubspot_id,
        email,
        firstname AS first_name,
        lastname AS last_name,
        phone,
        company,
        lifecyclestage AS lifecycle_stage,
        createdate AS created_at,
        lastmodifieddate AS updated_at,
        synced_at
    FROM public.contacts;
$$;

COMMENT ON FUNCTION mcp_readonly.fn_get_contacts() IS
'SECURITY DEFINER function that returns filtered contact data. Bypasses RLS and excludes sensitive columns (raw_properties, user_id).';

-- ============================================================================
-- STEP 5: Create VIEW that wraps the function
-- ============================================================================
-- This provides a table-like interface for MCP to query

CREATE OR REPLACE VIEW mcp_readonly.contacts AS
SELECT * FROM mcp_readonly.fn_get_contacts();

COMMENT ON VIEW mcp_readonly.contacts IS
'Read-only view of HubSpot CRM contacts for MCP/AI access. Excludes sensitive data. ~133K records.';

-- ============================================================================
-- STEP 6: Grant minimal permissions
-- ============================================================================
-- IMPORTANT: We ONLY grant access to mcp_readonly schema
-- NO grants on public schema = no direct table access

-- Allow connection to database
GRANT CONNECT ON DATABASE postgres TO mcp_readonly_user;

-- Allow usage of the mcp_readonly schema
GRANT USAGE ON SCHEMA mcp_readonly TO mcp_readonly_user;

-- Allow SELECT on the contacts view
GRANT SELECT ON mcp_readonly.contacts TO mcp_readonly_user;

-- Allow execution of the function (for direct calls if needed)
GRANT EXECUTE ON FUNCTION mcp_readonly.fn_get_contacts() TO mcp_readonly_user;

-- ============================================================================
-- STEP 7: Explicitly REVOKE any public schema access
-- ============================================================================
-- Defense in depth: ensure no access to public schema

REVOKE ALL ON SCHEMA public FROM mcp_readonly_user;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM mcp_readonly_user;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM mcp_readonly_user;

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration to verify setup)
-- ============================================================================
--
-- 1. Verify role exists:
--    SELECT rolname, rolcanlogin FROM pg_roles WHERE rolname = 'mcp_readonly_user';
--
-- 2. Verify schema exists:
--    SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'mcp_readonly';
--
-- 3. Verify view exists:
--    SELECT table_schema, table_name FROM information_schema.views
--    WHERE table_schema = 'mcp_readonly';
--
-- 4. Verify grants:
--    SELECT grantee, privilege_type, table_schema, table_name
--    FROM information_schema.table_privileges
--    WHERE grantee = 'mcp_readonly_user';
--
-- 5. Test as mcp_readonly_user (use psql or another client):
--    SET ROLE mcp_readonly_user;
--    SELECT COUNT(*) FROM mcp_readonly.contacts;  -- Should work
--    SELECT * FROM public.contacts LIMIT 1;       -- Should fail with permission denied
--
-- ============================================================================
-- CONNECTION STRING (replace YOUR_PROJECT_REF):
-- postgresql://mcp_readonly_user:G736EjgXM2_8mzdALgxmLBIP_jEnSwcy@db.YOUR_PROJECT_REF.supabase.co:5432/postgres?sslmode=require
-- ============================================================================
