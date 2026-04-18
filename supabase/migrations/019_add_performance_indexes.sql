-- Migration 019: Add Missing Performance Indexes
-- 
-- Fixes timeout issues on frequently queried columns by adding indexes.
-- Some indexes were already created in earlier migrations (003, 011, 012, etc.)
-- This migration only adds the ones that are actually missing.
--
-- Related Issue: AuthContext timeout on user_profiles query, slow API endpoints

-- ─── user_profiles indexes ─────────────────────────────────────────────────────

-- Index on role (used for filtering users by role in AdminDashboard)
CREATE INDEX IF NOT EXISTS idx_user_profiles_role 
  ON user_profiles(role);

-- Index on barangay (used for filtering by barangay in reports/users)
CREATE INDEX IF NOT EXISTS idx_user_profiles_barangay 
  ON user_profiles(barangay);

-- Composite index on verified status + joined date (for leaderboard)
CREATE INDEX IF NOT EXISTS idx_user_profiles_verified_joined 
  ON user_profiles(verified, joined DESC);

-- ─── pending_verification indexes ──────────────────────────────────────────────

-- Index on email (for OTP lookup, user creation check)
CREATE INDEX IF NOT EXISTS idx_pending_verification_email 
  ON pending_verification(email);

-- Index on status (for fetching pending approvals)
CREATE INDEX IF NOT EXISTS idx_pending_verification_status 
  ON pending_verification(verification_status);

-- ─── reports indexes ──────────────────────────────────────────────────────────

-- Index on status (for filtering reports by status in queues)
CREATE INDEX IF NOT EXISTS idx_reports_status 
  ON reports(status);

-- Composite index on status + created_at (for report queue views, sorting by date)
CREATE INDEX IF NOT EXISTS idx_reports_status_created 
  ON reports(status, created_at DESC);

-- NOTE: The following indexes were already created in earlier migrations:
-- Migration 003: idx_reports_user_id, idx_reports_user_id_status
-- Migration 012: idx_reports_patrol_assigned_to, idx_reports_patrol_status, idx_reports_ticket_id

-- ─── messages indexes ──────────────────────────────────────────────────────────

-- Composite index on conversation_id + created_at (for fetching messages in order)
-- Migration 011 created idx_messages_conversation but this adds the sort order
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
  ON messages(conversation_id, created_at DESC);

-- Index on sender_id (for user's sent messages)
CREATE INDEX IF NOT EXISTS idx_messages_sender_id 
  ON messages(sender_id);

-- ─── patrol_comments indexes ──────────────────────────────────────────────────

-- Index on report_id (for fetching comments on a report, sorted by date)
CREATE INDEX IF NOT EXISTS idx_patrol_comments_report_id 
  ON patrol_comments(report_id, created_at DESC);

-- Index on author_id (for user's comments)
CREATE INDEX IF NOT EXISTS idx_patrol_comments_author_id 
  ON patrol_comments(author_id);
