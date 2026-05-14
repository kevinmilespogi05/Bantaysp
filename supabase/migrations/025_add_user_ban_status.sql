-- Migration 025: Add ban status metadata to user_profiles

ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS banReason TEXT,
  ADD COLUMN IF NOT EXISTS bannedAt TIMESTAMP,
  ADD COLUMN IF NOT EXISTS bannedBy TEXT;

CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON public.user_profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_banned_at ON public.user_profiles(bannedAt);
