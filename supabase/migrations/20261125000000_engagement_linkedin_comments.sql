ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS linkedin_post_urn TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_comment_urn TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_reply_id TEXT,
  ADD COLUMN IF NOT EXISTS publish_error TEXT;

ALTER TABLE public.comments
  DROP CONSTRAINT IF EXISTS comments_status_check;

ALTER TABLE public.comments
  ADD CONSTRAINT comments_status_check
  CHECK (status IN ('Pending', 'Publishing', 'Approved & Sent', 'Dismissed'));

ALTER TABLE public.comments
  ADD CONSTRAINT comments_user_linkedin_comment_unique
  UNIQUE (user_id, linkedin_comment_urn);
