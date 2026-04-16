-- Migration 005: Data Consistency & Cleanup
-- Add triggers to keep comment counts in sync, ensure cascading deletes, standardize naming

BEGIN;

-- Step 1: Ensure cascading delete is in place on comments table
ALTER TABLE IF EXISTS public.comments
DROP CONSTRAINT IF EXISTS comments_report_id_fkey;

ALTER TABLE IF EXISTS public.comments
ADD CONSTRAINT comments_report_id_fkey 
  FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;

-- Step 2: Create function to update comment count on reports table
CREATE OR REPLACE FUNCTION sync_report_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update comment count on reports table
  UPDATE public.reports
  SET comments = (
    SELECT COUNT(*) FROM public.comments WHERE report_id = NEW.report_id
  )
  WHERE id = NEW.report_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create function to handle comment delete
CREATE OR REPLACE FUNCTION sync_report_comment_count_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Update comment count on reports table
  UPDATE public.reports
  SET comments = (
    SELECT COUNT(*) FROM public.comments WHERE report_id = OLD.report_id
  )
  WHERE id = OLD.report_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create triggers for comment insertion/update/delete
DROP TRIGGER IF EXISTS trigger_sync_comment_count_insert ON public.comments;
CREATE TRIGGER trigger_sync_comment_count_insert
AFTER INSERT ON public.comments
FOR EACH ROW
EXECUTE FUNCTION sync_report_comment_count();

DROP TRIGGER IF EXISTS trigger_sync_comment_count_delete ON public.comments;
CREATE TRIGGER trigger_sync_comment_count_delete
AFTER DELETE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION sync_report_comment_count_on_delete();

-- Step 5: Create function to sync user_profiles and leaderboard
CREATE OR REPLACE FUNCTION sync_user_leaderboard()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure leaderboard entry exists for every user_profile
  INSERT INTO public.leaderboard (user_id, points, reports_count, badge, verified)
  VALUES (NEW.auth_user_id, 0, 0, 'Member', FALSE)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger when user_profiles are created
DROP TRIGGER IF EXISTS trigger_sync_user_leaderboard ON public.user_profiles;
CREATE TRIGGER trigger_sync_user_leaderboard
AFTER INSERT ON public.user_profiles
FOR EACH ROW
WHEN (NEW.auth_user_id IS NOT NULL AND (NEW.role IS NULL OR NEW.role NOT IN ('admin', 'patrol')))
EXECUTE FUNCTION sync_user_leaderboard();

-- Step 7: Ensure upvotes count is also properly handled (optional, for consistency)
-- For now, upvotes are handled via the upvote endpoint

-- Step 8: Update existing comment counts to be accurate
UPDATE public.reports r
SET comments = (
  SELECT COUNT(*) FROM public.comments WHERE report_id = r.id
)
WHERE comments != (
  SELECT COUNT(*) FROM public.comments WHERE report_id = r.id
);

-- Step 9: Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_comments_report_id ON public.comments(report_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_points_desc ON public.leaderboard(points DESC);

-- Step 10: Create view for reporting clean data (optional, for admin dashboards)
DROP VIEW IF EXISTS public.report_stats CASCADE;
CREATE OR REPLACE VIEW public.report_stats AS
SELECT 
  r.id,
  r.title,
  r.status,
  r.verified,
  COUNT(DISTINCT c.id) as actual_comments,
  r.comments as stored_comments,
  r.upvotes,
  up.first_name || ' ' || up.last_name as reporter_name,
  up.verified as reporter_verified,
  r.created_at
FROM public.reports r
LEFT JOIN public.comments c ON r.id = c.report_id
LEFT JOIN public.user_profiles up ON r.user_id = up.auth_user_id
GROUP BY r.id, r.title, r.status, r.verified, r.comments, r.upvotes, 
         up.first_name, up.last_name, up.verified, r.created_at;

COMMIT;
