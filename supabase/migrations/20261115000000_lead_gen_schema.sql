-- LEAD GENERATION SCHEMA MIGRATION
-- Phase 3: Lead Generation Module
-- Adds target_companies and job_leads tables for Lead Generation feature

CREATE TABLE IF NOT EXISTS public.target_companies (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  industry TEXT,
  website TEXT,
  status TEXT DEFAULT 'Prospect' CHECK (status IN ('Prospect', 'Contacted', 'Engaged', 'Closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT target_companies_pkey PRIMARY KEY (id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_target_companies_user_status ON public.target_companies(user_id, status);

-- RLS
ALTER TABLE public.target_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own target companies" ON public.target_companies;
CREATE POLICY "Users can manage their own target companies" ON public.target_companies
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Grants
REVOKE ALL ON TABLE public.target_companies FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.target_companies TO authenticated;

-- Job Leads Table for Lead Generation
CREATE TABLE IF NOT EXISTS public.job_leads (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  employer_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  location TEXT,
  employment_type TEXT,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  description TEXT,
  verification_status TEXT DEFAULT 'Unverified' CHECK (verification_status IN ('Verified', 'Unverified', 'Expired')),
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT job_leads_pkey PRIMARY KEY (id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_leads_user ON public.job_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_job_leads_status ON public.job_leads(verification_status);

-- RLS
ALTER TABLE public.job_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own job leads" ON public.job_leads;
CREATE POLICY "Users can manage their own job leads" ON public.job_leads
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Grants
REVOKE ALL ON TABLE public.job_leads FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_leads TO authenticated;

-- Trigger to update updated_at timestamp (re-use function from initial schema if exists)
-- Or create a generic one if it doesn't.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to both tables
DROP TRIGGER IF EXISTS trigger_update_target_companies ON public.target_companies;
CREATE TRIGGER trigger_update_target_companies
  BEFORE UPDATE ON public.target_companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_job_leads ON public.job_leads;
CREATE TRIGGER trigger_update_job_leads
  BEFORE UPDATE ON public.job_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
