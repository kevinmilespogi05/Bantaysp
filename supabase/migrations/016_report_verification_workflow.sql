-- Migration 016: Report Verification Workflow
-- Adds admin approval workflow for reports
-- Status flow: pending_verification -> approved -> in_progress -> resolved
--              or pending_verification -> rejected

BEGIN;

-- Step 0: Create audit_log table if not exists
CREATE TABLE IF NOT EXISTS public.audit_log (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);

-- Step 1: Update status constraint to include pending_verification
ALTER TABLE IF EXISTS public.reports
DROP CONSTRAINT IF EXISTS reports_status_check;

ALTER TABLE IF EXISTS public.reports
ADD CONSTRAINT reports_status_check 
CHECK (status IN ('pending_verification', 'approved', 'rejected', 'in_progress', 'resolved'));

-- Step 2: Add workflow tracking columns
ALTER TABLE IF EXISTS public.reports
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Step 3: Create indexes for admin views
CREATE INDEX IF NOT EXISTS idx_reports_status_pending ON public.reports(status) 
WHERE status = 'pending_verification';

CREATE INDEX IF NOT EXISTS idx_reports_approved_by ON public.reports(approved_by);

CREATE INDEX IF NOT EXISTS idx_reports_resolved_by ON public.reports(resolved_by);

-- Step 4: Create audit function to track report status changes
CREATE OR REPLACE FUNCTION log_report_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when report moves to approved
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    INSERT INTO audit_log (entity_type, entity_id, action, user_id, details)
    VALUES ('report', NEW.id, 'approved', NEW.approved_by, 
            jsonb_build_object('title', NEW.title, 'approved_at', NEW.approved_at));
    
    -- Award points to reporter when approved
    IF NEW.user_id IS NOT NULL THEN
      UPDATE public.leaderboard
      SET 
        points = points + 50,
        updated_at = NOW()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;

  -- Log when report is rejected
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    INSERT INTO audit_log (entity_type, entity_id, action, user_id, details)
    VALUES ('report', NEW.id, 'rejected', NEW.rejected_by,
            jsonb_build_object('reason', NEW.rejection_reason, 'rejected_at', NEW.rejected_at));
  END IF;

  -- Log when report is resolved by patrol
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    INSERT INTO audit_log (entity_type, entity_id, action, user_id, details)
    VALUES ('report', NEW.id, 'resolved', NEW.resolved_by,
            jsonb_build_object('resolved_at', NEW.resolved_at));
    
    -- Award additional points to reporter when resolved
    IF NEW.user_id IS NOT NULL THEN
      UPDATE public.leaderboard
      SET 
        points = points + 25,
        updated_at = NOW()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Drop existing trigger if any, then create the new one
DROP TRIGGER IF EXISTS report_status_change_trigger ON public.reports;

CREATE TRIGGER report_status_change_trigger
BEFORE UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION log_report_status_change();

COMMIT;
