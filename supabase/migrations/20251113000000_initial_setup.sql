-- ================================================================
-- INITIAL SETUP - Complete Database Schema
-- ================================================================
-- This migration combines the entire database setup including:
-- - Core tables (contacts, user_settings, sync_logs)
-- - Auth hook for email domain restriction
-- - All necessary permissions and configurations
-- ================================================================

-- ================================================================
-- PART 1: Core Database Schema
-- ================================================================

-- Updated At Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Contacts Table
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  company TEXT,
  lifecycle_stage TEXT,
  lead_status TEXT,
  last_synced_at TIMESTAMPTZ,
  raw_properties JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Settings Table
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  hubspot_api_key TEXT,
  sync_frequency TEXT DEFAULT 'manual',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sync Logs Table
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL,
  records_synced INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(email);
CREATE INDEX IF NOT EXISTS idx_sync_logs_user_id ON public.sync_logs(user_id);

-- Enable Row Level Security (idempotent)
DO $$
BEGIN
  ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can insert their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can update their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can delete their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can view their own sync logs" ON public.sync_logs;
DROP POLICY IF EXISTS "Users can insert their own sync logs" ON public.sync_logs;

-- Contacts Policies
CREATE POLICY "Users can view their own contacts"
  ON public.contacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contacts"
  ON public.contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts"
  ON public.contacts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts"
  ON public.contacts FOR DELETE
  USING (auth.uid() = user_id);

-- User Settings Policies
CREATE POLICY "Users can view their own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings"
  ON public.user_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Sync Logs Policies
CREATE POLICY "Users can view their own sync logs"
  ON public.sync_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync logs"
  ON public.sync_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_contacts_updated_at ON public.contacts;
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;

-- Create Triggers
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- PART 2: Email Domain Restriction for Auth
-- ================================================================

-- Create ENUM type for domain classification
DO $$
BEGIN
  CREATE TYPE signup_email_domain_type AS ENUM ('allow', 'deny');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create signup_email_domains table (for reference/documentation)
CREATE TABLE IF NOT EXISTS public.signup_email_domains (
  id SERIAL PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  type signup_email_domain_type NOT NULL,
  reason TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Disable RLS on signup_email_domains (not user-facing data) (idempotent)
DO $$
BEGIN
  ALTER TABLE public.signup_email_domains DISABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_signup_email_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_signup_email_domains_set_updated_at ON public.signup_email_domains;

CREATE TRIGGER trg_signup_email_domains_set_updated_at
BEFORE UPDATE ON public.signup_email_domains
FOR EACH ROW
EXECUTE PROCEDURE update_signup_email_domains_updated_at();

-- Insert domain configuration (for documentation purposes)
-- Note: The auth hook uses hardcoded domains for security and performance
INSERT INTO public.signup_email_domains (domain, type, reason)
VALUES
  ('r36.com', 'allow', 'R36 company email'),
  ('zing-work.com', 'allow', 'Zing Work company email'),
  ('gmail.com', 'deny', 'Public email provider'),
  ('yahoo.com', 'deny', 'Public email provider'),
  ('hotmail.com', 'deny', 'Public email provider'),
  ('outlook.com', 'deny', 'Public email provider')
ON CONFLICT (domain) DO NOTHING;

-- ================================================================
-- PART 3: Auth Hook Function (Hardcoded Domains)
-- ================================================================
-- This function uses hardcoded domains for security and performance.
-- Database queries in auth hooks have limited context and can fail.
-- Hardcoded approach is faster, more secure, and more reliable.
--
-- To modify allowed domains: Edit this migration and redeploy.
-- This intentional friction ensures security review for domain changes.
-- ================================================================

CREATE OR REPLACE FUNCTION public.hook_restrict_signup_by_email_domain(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  email TEXT;
  domain TEXT;
BEGIN
  -- Extract email from the event payload
  email := event->'user'->>'email';

  -- Validate email exists
  IF email IS NULL OR email = '' THEN
    RETURN JSONB_BUILD_OBJECT(
      'error', JSONB_BUILD_OBJECT(
        'message', 'Email is required',
        'http_code', 400
      )
    );
  END IF;

  -- Extract domain (everything after @)
  domain := LOWER(SPLIT_PART(email, '@', 2));

  -- Validate domain exists
  IF domain IS NULL OR domain = '' THEN
    RETURN JSONB_BUILD_OBJECT(
      'error', JSONB_BUILD_OBJECT(
        'message', 'Invalid email format',
        'http_code', 400
      )
    );
  END IF;

  -- Check if domain is in allowed list (hardcoded for security)
  IF domain IN ('r36.com', 'zing-work.com') THEN
    RETURN '{}'::JSONB;
  END IF;

  -- Check if domain is in explicitly denied list (hardcoded)
  IF domain IN ('gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com') THEN
    RETURN JSONB_BUILD_OBJECT(
      'error', JSONB_BUILD_OBJECT(
        'message', 'Signups from this email domain are not allowed.',
        'http_code', 403
      )
    );
  END IF;

  -- All other domains are denied by default
  RETURN JSONB_BUILD_OBJECT(
    'error', JSONB_BUILD_OBJECT(
      'message', 'Please use an official Zing email address (@r36.com or @zing-work.com).',
      'http_code', 403
    )
  );
END;
$$;

-- Grant necessary permissions for auth hook
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.hook_restrict_signup_by_email_domain TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.hook_restrict_signup_by_email_domain FROM authenticated, anon, public;

-- ================================================================
-- SETUP COMPLETE
-- ================================================================
-- Next steps:
-- 1. Enable auth hook in Dashboard: Authentication → Hooks → before-user-created
-- 2. Select function: hook_restrict_signup_by_email_domain
-- 3. Test signup with allowed (@r36.com, @zing-work.com) and denied domains
-- ================================================================
