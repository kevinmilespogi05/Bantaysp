-- Add admin_notes column to reports table for private admin context
-- This field is only visible to admins and not displayed to the public

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT NULL;

-- Add comment to document the column purpose
COMMENT ON COLUMN public.reports.admin_notes IS 'Private notes for administrators only - not visible to reporters or public';

-- Create index for admin views (optional, for filtering/searching admin notes)
CREATE INDEX IF NOT EXISTS idx_reports_admin_notes_notnull ON public.reports(id) 
  WHERE admin_notes IS NOT NULL;
