-- Migration 013: Add accepted status to reports
-- Adds 'accepted' status to the main status column to support the new workflow:
-- pending -> accepted -> in_progress -> resolved

BEGIN;

-- Step 1: Drop the old check constraint
ALTER TABLE IF EXISTS public.reports
DROP CONSTRAINT IF EXISTS reports_status_check;

-- Step 2: Add the new check constraint with 'accepted' status
ALTER TABLE IF EXISTS public.reports
ADD CONSTRAINT reports_status_check
CHECK (status IN ('pending', 'accepted', 'in_progress', 'resolved'));

COMMIT;
