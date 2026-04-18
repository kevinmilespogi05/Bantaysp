-- Migration 020: Create Visitor Tracking Table
--
-- Purpose: Track home page visitors in real-time for displaying live visitor count
-- Features: 
--   - Tracks unique visitor sessions (IP-based for unauthenticated users)
--   - Increments total visitor count on each page load
--   - Provides daily/total visitor statistics

-- ─── Create visitors table ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id TEXT UNIQUE NOT NULL
);

-- ─── Create visitor_stats table for aggregated counts ─────────────────────────

CREATE TABLE IF NOT EXISTS visitor_stats (
  id SERIAL PRIMARY KEY,
  total_visits INT DEFAULT 0,
  unique_visitors INT DEFAULT 0,
  today_visits INT DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Initialize visitor stats (single row) ────────────────────────────────────

INSERT INTO visitor_stats (id, total_visits, unique_visitors, today_visits) 
VALUES (1, 80, 80, 80)
ON CONFLICT (id) DO NOTHING;

-- ─── Indexes for performance ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_visitors_session_id ON visitors(session_id);
CREATE INDEX IF NOT EXISTS idx_visitors_visited_at ON visitors(visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_ip_address ON visitors(ip_address);

-- ─── Add comment for documentation ────────────────────────────────────────────

COMMENT ON TABLE visitors IS 'Tracks individual visitor sessions with IP address and user agent for analytics';
COMMENT ON TABLE visitor_stats IS 'Aggregated visitor statistics (single row table)';

-- ─── Row Level Security (RLS) ─────────────────────────────────────────────────

-- Enable RLS on both tables
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_stats ENABLE ROW LEVEL SECURITY;

-- ─── Policies for visitors table ──────────────────────────────────────────────

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow anonymous visitor tracking" ON visitors;
DROP POLICY IF EXISTS "Allow service role to read visitors" ON visitors;

-- Policy 1: Anyone can INSERT a new visitor (anonymous or authenticated)
CREATE POLICY "Allow anonymous visitor tracking" ON visitors
  FOR INSERT
  WITH CHECK (true);

-- Policy 2: Only service role can READ visitors (admin/analytics)
CREATE POLICY "Allow service role to read visitors" ON visitors
  FOR SELECT
  USING (auth.role() = 'service_role');

-- ─── Policies for visitor_stats table ─────────────────────────────────────────

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow anonymous read visitor stats" ON visitor_stats;
DROP POLICY IF EXISTS "Allow service role to update visitor stats" ON visitor_stats;

-- Policy 1: Anyone can READ visitor stats (frontend needs this)
CREATE POLICY "Allow anonymous read visitor stats" ON visitor_stats
  FOR SELECT
  USING (true);

-- Policy 2: Only service role can UPDATE stats (backend RPC function)
CREATE POLICY "Allow service role to update visitor stats" ON visitor_stats
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

