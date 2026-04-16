-- Create upvotes table for tracking per-user upvotes on reports
CREATE TABLE IF NOT EXISTS public.upvotes (
  id BIGINT NOT NULL PRIMARY KEY,
  user_id TEXT NOT NULL,
  report_id TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  UNIQUE(user_id, report_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_upvotes_user_report ON upvotes(user_id, report_id);
CREATE INDEX IF NOT EXISTS idx_upvotes_report ON upvotes(report_id);
