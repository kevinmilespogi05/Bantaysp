-- Migration 012: Patrol Report Integration
-- Adds patrol workflow fields to reports table and creates patrol-specific tables
-- Enables shared report model between residents and patrol officers

BEGIN;

-- Step 1: Add patrol-specific columns to reports table
ALTER TABLE IF EXISTS public.reports
ADD COLUMN IF NOT EXISTS ticket_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS patrol_assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS patrol_status TEXT DEFAULT 'pending' CHECK (patrol_status IN ('pending', 'accepted', 'in_progress', 'completed', 'escalated')),
ADD COLUMN IF NOT EXISTS patrol_acknowledged_at TIMESTAMP;

-- Step 2: Create indexes for patrol-specific queries
CREATE INDEX IF NOT EXISTS idx_reports_patrol_assigned_to ON public.reports(patrol_assigned_to);
CREATE INDEX IF NOT EXISTS idx_reports_patrol_status ON public.reports(patrol_status);
CREATE INDEX IF NOT EXISTS idx_reports_ticket_id ON public.reports(ticket_id);

-- Step 3: Create patrol_assignments table (for admin explicit assignments)
CREATE TABLE IF NOT EXISTS public.patrol_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id TEXT NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  assigned_patrol_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by_admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignment_status TEXT DEFAULT 'pending' CHECK (assignment_status IN ('pending', 'accepted', 'declined')),
  assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Step 4: Create indexes for patrol_assignments
CREATE INDEX IF NOT EXISTS idx_patrol_assignments_report_id ON public.patrol_assignments(report_id);
CREATE INDEX IF NOT EXISTS idx_patrol_assignments_assigned_patrol_id ON public.patrol_assignments(assigned_patrol_id);
CREATE INDEX IF NOT EXISTS idx_patrol_assignments_status ON public.patrol_assignments(assignment_status);
CREATE INDEX IF NOT EXISTS idx_patrol_assignments_assigned_at ON public.patrol_assignments(assigned_at);

-- Step 5: Create patrol_comments table for real-time updates
CREATE TABLE IF NOT EXISTS public.patrol_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id TEXT NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('patrol', 'admin', 'resident')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Step 6: Create indexes for patrol_comments
CREATE INDEX IF NOT EXISTS idx_patrol_comments_report_id ON public.patrol_comments(report_id);
CREATE INDEX IF NOT EXISTS idx_patrol_comments_author_id ON public.patrol_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_patrol_comments_created_at ON public.patrol_comments(created_at);

-- Step 7: Enable Realtime for patrol_comments table
ALTER PUBLICATION supabase_realtime ADD TABLE public.patrol_comments;

-- Step 8: Enable RLS on new tables
ALTER TABLE public.patrol_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrol_comments ENABLE ROW LEVEL SECURITY;

-- Step 9: Create RLS policies for patrol_assignments
-- Admins can view all assignments
CREATE POLICY "patrol_assignments_admin_view"
  ON public.patrol_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.auth_user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Assigned patrol can view their assignments
CREATE POLICY "patrol_assignments_patrol_view"
  ON public.patrol_assignments FOR SELECT
  USING (assigned_patrol_id = auth.uid());

-- Admins can create assignments
CREATE POLICY "patrol_assignments_admin_insert"
  ON public.patrol_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.auth_user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Patrol can update their assignment status (accept/decline)
CREATE POLICY "patrol_assignments_patrol_update"
  ON public.patrol_assignments FOR UPDATE
  USING (assigned_patrol_id = auth.uid())
  WITH CHECK (
    assigned_patrol_id = auth.uid() 
    AND (
      assignment_status IN ('pending', 'accepted', 'declined')
    )
  );

-- Step 10: Create RLS policies for patrol_comments
-- Anyone authenticated can view patrol comments
CREATE POLICY "patrol_comments_view"
  ON public.patrol_comments FOR SELECT
  USING (auth.role() = 'authenticated');

-- Patrol and admin can insert comments
CREATE POLICY "patrol_comments_insert"
  ON public.patrol_comments FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND author_role IN ('patrol', 'admin')
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.auth_user_id = auth.uid()
      AND user_profiles.role IN ('patrol', 'admin')
    )
  );

-- Only comment author can update their comments
CREATE POLICY "patrol_comments_update"
  ON public.patrol_comments FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

COMMIT;
