-- INITIAL SCHEMA MIGRATION: LinkedIn AI Studio
-- Phase 1: Authentication & Database Foundation

-- 0. Setup: Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Posts Table (Composite PK for tenant isolation)
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Draft', 'Scheduled', 'Published')),
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT posts_pkey PRIMARY KEY (id, user_id)
);

-- 3. Post Metrics Table (Composite FK)
CREATE TABLE IF NOT EXISTS public.post_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  impressions INTEGER DEFAULT 0 CONSTRAINT check_impressions_non_negative CHECK (impressions >= 0),
  likes INTEGER DEFAULT 0 CONSTRAINT check_likes_non_negative CHECK (likes >= 0),
  comments INTEGER DEFAULT 0 CONSTRAINT check_comments_non_negative CHECK (comments >= 0),
  shares INTEGER DEFAULT 0 CONSTRAINT check_shares_non_negative CHECK (shares >= 0),
  engagement_rate NUMERIC(5,2) DEFAULT 0.00 CONSTRAINT check_engagement_rate_non_negative CHECK (engagement_rate >= 0.00),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_post_owner FOREIGN KEY (post_id, user_id) REFERENCES public.posts(id, user_id) ON DELETE CASCADE
);

-- 4. Integration Secrets Table (Encrypted)
CREATE TABLE IF NOT EXISTS public.integration_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  encrypted_access_token TEXT NOT NULL,
  encrypted_refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unq_user_provider UNIQUE (user_id, provider)
);

-- 5. Activity Logs Table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_posts_user_status ON public.posts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_post_metrics_user_post ON public.post_metrics(user_id, post_id);
CREATE INDEX IF NOT EXISTS idx_post_metrics_recorded ON public.post_metrics(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created ON public.activity_logs(user_id, created_at DESC);

-- 7. RLS - Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own permitted profile fields" ON public.profiles;
CREATE POLICY "Users can update their own permitted profile fields" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Posts Policies
DROP POLICY IF EXISTS "Users can manage their own posts" ON public.posts;
CREATE POLICY "Users can manage their own posts" ON public.posts FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Metrics Policies (Read Only for Users)
DROP POLICY IF EXISTS "Users can view metrics for their own posts" ON public.post_metrics;
CREATE POLICY "Users can view metrics for their own posts" ON public.post_metrics FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Secrets Policies (Zero Client Access)
DROP POLICY IF EXISTS "Deny all client access to secrets" ON public.integration_secrets;
CREATE POLICY "Deny all client access to secrets" ON public.integration_secrets FOR ALL TO authenticated, anon USING (false);

-- Activity Logs Policies (Read Only for Users)
DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.activity_logs;
CREATE POLICY "Users can view their own activity logs" ON public.activity_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 8. GRANT & REVOKE Privileges
-- Targeted revokes to protect against default public privileges without altering unrelated pre-existing tables
REVOKE ALL ON TABLE public.profiles, public.posts, public.post_metrics, public.integration_secrets, public.activity_logs FROM PUBLIC, anon, authenticated;

-- Profiles
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (full_name, avatar_url) ON public.profiles TO authenticated;

-- Posts
GRANT ALL ON public.posts TO authenticated;

-- Metrics (Read only from client)
GRANT SELECT ON public.post_metrics TO authenticated;

-- Logs (Read only from client)
GRANT SELECT ON public.activity_logs TO authenticated;

-- Secrets: Keep zero privileges for authenticated/anon roles
-- Service role client will bypass RLS and have full access as it uses postgres/service_role

-- 9. Secure Triggers and Functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.email IS NULL THEN
    RAISE EXCEPTION 'User email cannot be null';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_url'), '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to sync email updates from auth.users to profiles
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.profiles
  SET
    email = NEW.email,
    updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_user_update() OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.handle_user_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();
