-- Migration 021: Create increment_visitor_count RPC Function
--
-- Purpose: RPC function to increment visitor stats
-- This function is called by the backend API when a new visitor is tracked

-- ─── Drop function if exists (for safe migration) ────────────────────────────

DROP FUNCTION IF EXISTS increment_visitor_count();

-- ─── Create RPC function ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_visitor_count()
RETURNS void AS $$
BEGIN
  -- Increment total_visits counter
  UPDATE visitor_stats
  SET 
    total_visits = total_visits + 1,
    last_updated = NOW()
  WHERE id = 1;
  
  -- If no row exists, insert one
  IF NOT FOUND THEN
    INSERT INTO visitor_stats (total_visits, unique_visitors, today_visits)
    VALUES (1, 1, 1)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ─── Grant execute permission to service role and anon role ────────────────

GRANT EXECUTE ON FUNCTION increment_visitor_count() TO authenticated, anon, service_role;
