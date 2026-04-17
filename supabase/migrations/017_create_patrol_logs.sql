-- Migration 017: Create patrol_logs table
-- Separate table for system logs and patrol officer logs

BEGIN;

-- Create patrol_logs table
CREATE TABLE IF NOT EXISTS public.patrol_logs (
  id BIGSERIAL PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  log_type TEXT NOT NULL, -- 'system', 'patrol', 'admin'
  title TEXT NOT NULL,
  details TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_patrol_logs_report_id ON public.patrol_logs(report_id);
CREATE INDEX IF NOT EXISTS idx_patrol_logs_created_at ON public.patrol_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patrol_logs_log_type ON public.patrol_logs(log_type);

-- Enable RLS
ALTER TABLE public.patrol_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view logs for reports
CREATE POLICY "Anyone can view patrol logs" ON public.patrol_logs
  FOR SELECT USING (true);

-- Policy: Admins and system can insert logs
CREATE POLICY "Admins and system can insert logs" ON public.patrol_logs
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL OR log_type = 'system'
  );

COMMIT;
