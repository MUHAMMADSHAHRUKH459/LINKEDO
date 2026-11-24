-- ADD LINKEDIN_POST_ID TO POSTS TABLE
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS linkedin_post_id TEXT;

-- Index for searching by LinkedIn post ID
CREATE INDEX IF NOT EXISTS idx_posts_linkedin_post_id ON public.posts(linkedin_post_id);
