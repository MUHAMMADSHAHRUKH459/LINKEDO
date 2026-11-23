-- NETWORKING CONNECTIONS MIGRATION
CREATE TABLE IF NOT EXISTS public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  industry TEXT NOT NULL,
  mutual_count INTEGER DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('Suggested', 'Requested', 'Connected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_connections_user_status ON public.connections(user_id, status);

-- RLS
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own connections" ON public.connections;
CREATE POLICY "Users can manage their own connections" ON public.connections FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Revoke public access
REVOKE ALL ON TABLE public.connections FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.connections TO authenticated;