-- Migration 018: Add Resolution Verification Fields
-- Adds fields to track admin verification of patrol resolutions

BEGIN;

-- Add verification columns for tracking when admin verifies patrol resolutions
ALTER TABLE IF EXISTS public.reports
ADD COLUMN IF NOT EXISTS verified_by_admin UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;

-- Create index for admin verification tracking
CREATE INDEX IF NOT EXISTS idx_reports_verified_by_admin ON public.reports(verified_by_admin);
CREATE INDEX IF NOT EXISTS idx_reports_verified_at ON public.reports(verified_at);

-- Add comments for clarity
COMMENT ON COLUMN public.reports.verified_by_admin IS 'Admin user ID who verified the patrol resolution (when status = submitted -> resolved)';
COMMENT ON COLUMN public.reports.verified_at IS 'Timestamp when admin verified the patrol resolution';

COMMIT;
