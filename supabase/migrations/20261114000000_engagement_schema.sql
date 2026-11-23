-- ENGAGEMENT COMMENTS MIGRATION
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL,
  post_user_id UUID,
  author TEXT NOT NULL,
  author_role TEXT NOT NULL,
  post_title TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  ai_reply TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Pending', 'Approved & Sent', 'Dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Composite foreign key to reference posts composite primary key
  CONSTRAINT fk_comment_post FOREIGN KEY (post_id, post_user_id)
    REFERENCES public.posts(id, user_id) ON DELETE SET NULL (post_user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_comments_user_status ON public.comments(user_id, status);

-- RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own comments" ON public.comments;
CREATE POLICY "Users can manage their own comments" ON public.comments FOR ALL TO authenticated USING (auth.uid() = user_id);

REVOKE ALL ON TABLE public.comments FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.comments TO authenticated;
