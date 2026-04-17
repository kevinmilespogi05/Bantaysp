-- Migration 016: Add anonymous flag for reports
-- Allows admins to mark reports as anonymous per user request

BEGIN;

-- Add is_anonymous column to reports table
ALTER TABLE IF EXISTS public.reports
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT FALSE;

-- Create index for filtering anonymous reports
CREATE INDEX IF NOT EXISTS idx_reports_is_anonymous ON public.reports(is_anonymous);

-- Verify the migration
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'reports' AND column_name = 'is_anonymous';

COMMIT;
