-- Migration: Add proper leaderboard sync mechanism with user tracking and ranking functions

-- Step 1: Add UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 2: Ensure user_profiles has auth_user_id for linking to Supabase Auth
ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 3: Add email column to user_profiles if it doesn't exist
ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- Step 4: Rebuild leaderboard table with proper structure and foreign keys
-- First, back up old data if it exists
CREATE TABLE IF NOT EXISTS public.leaderboard_backup AS
SELECT * FROM public.leaderboard;

-- Drop old leaderboard table
DROP TABLE IF EXISTS public.leaderboard CASCADE;

-- Create new leaderboard table with proper schema
CREATE TABLE public.leaderboard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL UNIQUE REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  rank INTEGER,
  points INTEGER NOT NULL DEFAULT 0,
  reports_count INTEGER NOT NULL DEFAULT 0,
  badge TEXT NOT NULL DEFAULT 'Member',
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Step 5: Create indexes for performance
CREATE INDEX idx_leaderboard_points_desc ON public.leaderboard(points DESC);
CREATE INDEX idx_leaderboard_rank ON public.leaderboard(rank ASC);
CREATE INDEX idx_leaderboard_user_id ON public.leaderboard(user_id);
CREATE INDEX idx_leaderboard_created_at ON public.leaderboard(created_at DESC);
CREATE INDEX idx_leaderboard_badge ON public.leaderboard(badge);

-- Step 6: Create function to calculate leaderboard ranking
CREATE OR REPLACE FUNCTION public.calculate_leaderboard_ranking()
RETURNS TABLE (user_id TEXT, new_rank INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lb.user_id,
    ROW_NUMBER() OVER (ORDER BY lb.points DESC, lb.created_at ASC)::INTEGER as new_rank
  FROM public.leaderboard lb
  JOIN public.user_profiles up ON lb.user_id = up.id
  WHERE up.role != 'admin' AND up.role != 'patrol'
  ORDER BY new_rank;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create function to assign badges based on rank
CREATE OR REPLACE FUNCTION public.assign_badge_by_rank(p_rank INTEGER)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE
    WHEN p_rank <= 2 THEN 'Gold'
    WHEN p_rank <= 4 THEN 'Silver'
    WHEN p_rank <= 8 THEN 'Bronze'
    ELSE 'Member'
  END;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create function to refresh all leaderboard rankings
CREATE OR REPLACE FUNCTION public.refresh_leaderboard_rankings()
RETURNS void AS $$
DECLARE
  v_rank INTEGER;
  v_user_id TEXT;
BEGIN
  -- Get all users who should be in leaderboard (not admin or patrol)
  FOR v_user_id, v_rank IN 
    SELECT user_id, new_rank FROM public.calculate_leaderboard_ranking()
  LOOP
    UPDATE public.leaderboard
    SET 
      rank = v_rank,
      badge = public.assign_badge_by_rank(v_rank),
      updated_at = NOW()
    WHERE user_id = v_user_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create trigger to auto-create leaderboard entry for new users (non-admin, non-patrol)
CREATE OR REPLACE FUNCTION public.create_leaderboard_entry_for_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create if user role is 'resident' (not 'admin' or 'patrol')
  IF NEW.role IS NULL OR NEW.role = 'resident' THEN
    INSERT INTO public.leaderboard (user_id, points, reports_count, badge, rank)
    VALUES (NEW.id, 0, 0, 'Member', NULL)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Attach trigger to user_profiles table
DROP TRIGGER IF EXISTS trigger_create_leaderboard_entry ON public.user_profiles;
CREATE TRIGGER trigger_create_leaderboard_entry
AFTER INSERT ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_leaderboard_entry_for_user();

-- Step 11: Create trigger to refresh rankings when leaderboard is updated
CREATE OR REPLACE FUNCTION public.refresh_rankings_on_leaderboard_change()
RETURNS TRIGGER AS $$
BEGIN
  -- After any update to points/reports, refresh all rankings
  PERFORM public.refresh_leaderboard_rankings();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 12: Attach trigger to leaderboard table for automatic ranking refresh
DROP TRIGGER IF EXISTS trigger_refresh_rankings_on_update ON public.leaderboard;
CREATE TRIGGER trigger_refresh_rankings_on_update
AFTER INSERT OR UPDATE OF points, reports_count ON public.leaderboard
FOR EACH ROW
EXECUTE FUNCTION public.refresh_rankings_on_leaderboard_change();

-- Step 13: Add email to user_profiles for login purposes (if not exists)
-- This would be filled during registration via the /register endpoint

-- Step 14: Populate leaderboard for existing users in user_profiles
INSERT INTO public.leaderboard (user_id, points, reports_count, badge, rank)
SELECT 
  id,
  COALESCE(points, 0),
  COALESCE(reports, 0),
  COALESCE(badge, 'Member'),
  NULL
FROM public.user_profiles
WHERE role IS NULL OR role = 'resident'
ON CONFLICT (user_id) DO NOTHING;

-- Step 15: Refresh rankings after data migration
SELECT public.refresh_leaderboard_rankings();

-- Step 16: Enable Row Level Security (optional, for Supabase auth)
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow read to all, write only to authenticated users, delete to service role)
DROP POLICY IF EXISTS "Leaderboard readable by all" ON public.leaderboard;
CREATE POLICY "Leaderboard readable by all"
ON public.leaderboard FOR SELECT
USING (true);

DROP POLICY IF EXISTS "User profiles readable by all" ON public.user_profiles;
CREATE POLICY "User profiles readable by all"
ON public.user_profiles FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
ON public.user_profiles FOR UPDATE
USING (auth.uid()::text = id OR auth.uid()::text = auth_user_id::text);

-- Grant permissions
GRANT SELECT ON public.leaderboard TO anon, authenticated;
GRANT SELECT ON public.user_profiles TO anon, authenticated;
GRANT UPDATE ON public.user_profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_leaderboard_rankings() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.calculate_leaderboard_ranking() TO authenticated, anon;
