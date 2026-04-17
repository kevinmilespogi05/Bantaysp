-- Migration 017: Patrol Workflow Revision
-- Updates status lifecycle: approved → accepted → in_progress → resolved
-- Adds resolution evidence and notes fields

BEGIN;

-- Step 1: Update reports table with new columns for resolution evidence and notes
ALTER TABLE IF EXISTS public.reports
ADD COLUMN IF NOT EXISTS resolution_notes TEXT,
ADD COLUMN IF NOT EXISTS resolution_evidence_url TEXT;

-- Step 2: Update status check constraint to include 'accepted' status
-- First, drop the old constraint
ALTER TABLE IF EXISTS public.reports
DROP CONSTRAINT IF EXISTS reports_status_check;

-- Add the new constraint with updated statuses
ALTER TABLE IF EXISTS public.reports
ADD CONSTRAINT reports_status_check 
  CHECK (status IN ('pending_verification', 'approved', 'accepted', 'in_progress', 'submitted', 'resolved', 'rejected'));

-- Step 3: Create index for resolution lookups
CREATE INDEX IF NOT EXISTS idx_reports_resolved_at ON public.reports(resolved_at);
CREATE INDEX IF NOT EXISTS idx_reports_status_patrol ON public.reports(status, patrol_assigned_to);

-- Step 4: Add comments for clarity
COMMENT ON COLUMN public.reports.status IS 
'Report lifecycle: pending_verification → approved (admin verified) → accepted (patrol assigned) → in_progress (patrol responding) → submitted (resolution awaiting admin approval) → resolved (closed)';

COMMENT ON COLUMN public.reports.resolution_notes IS 
'Notes from patrol officer upon case resolution';

COMMENT ON COLUMN public.reports.resolution_evidence_url IS 
'URL to evidence photo uploaded by patrol officer upon resolution';

COMMIT;
