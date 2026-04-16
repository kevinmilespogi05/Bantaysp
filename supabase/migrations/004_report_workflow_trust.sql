-- Migration 004: Report Workflow & Trust System
-- Add status "rejected" option, create verification triggers for leaderboard points

BEGIN;

-- Step 1: Update status constraint to include "rejected"
-- Note: PostgreSQL doesn't allow direct constraint modification, so we use a workaround
-- Drop the existing constraint (recreate table or use generated column)
-- For now, we'll add a new CHECK constraint through ALTER TABLE

ALTER TABLE IF EXISTS public.reports
DROP CONSTRAINT IF EXISTS reports_status_check;

ALTER TABLE IF EXISTS public.reports
ADD CONSTRAINT reports_status_check CHECK (status IN ('pending', 'in_progress', 'resolved', 'rejected'));

-- Step 2: Create a function to handle leaderboard points when report is verified
CREATE OR REPLACE FUNCTION handle_report_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when verified changes from false to true
  IF NEW.verified = TRUE AND OLD.verified = FALSE AND NEW.user_id IS NOT NULL THEN
    -- Check if leaderboard entry exists
    INSERT INTO public.leaderboard (user_id, points, reports_count, badge, verified)
    VALUES (NEW.user_id, 50, 1, 'Member', FALSE)
    ON CONFLICT (user_id) DO UPDATE SET
      points = leaderboard.points + 50,
      reports_count = leaderboard.reports_count + 1,
      updated_at = NOW();
    
    RAISE NOTICE 'Leaderboard updated for user % on report verification', NEW.user_id;
  END IF;
  
  -- Handle point penalty for rejected reports
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' AND NEW.user_id IS NOT NULL THEN
    -- Deduct 10 points for rejected reports (optional)
    UPDATE public.leaderboard
    SET 
      points = GREATEST(points - 10, 0),
      updated_at = NOW()
    WHERE user_id = NEW.user_id;
    
    RAISE NOTICE 'Penalty applied to user % for rejected report', NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger for verification
DROP TRIGGER IF EXISTS trigger_report_verification ON public.reports;

CREATE TRIGGER trigger_report_verification
AFTER UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION handle_report_verification();

-- Step 4: Add index for verification queries
CREATE INDEX IF NOT EXISTS idx_reports_verified ON public.reports(verified);
CREATE INDEX IF NOT EXISTS idx_reports_status_verified ON public.reports(status, verified);

-- Step 5: Remove old points logic from report creation
-- (Backend will need to skip the immediate +50 points on creation)

COMMIT;
