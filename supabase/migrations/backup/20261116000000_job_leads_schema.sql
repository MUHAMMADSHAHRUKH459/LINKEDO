-- JOB LEADS FINDER SCHEMA MIGRATION
-- Phase 3: Lead Generation Module
-- Adds job_leads table for verified job listings

CREATE TABLE IF NOT EXISTS public.job_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS trigger_update_job_leads ON public.job_leads;
CREATE TRIGGER trigger_update_job_leads
  BEFORE UPDATE ON public.job_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
