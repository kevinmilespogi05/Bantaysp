-- Migration 003: Refactor reports table to link to authenticated users
-- Adds user_id (UUID), verified, and image_url columns to reports
-- Refactors leaderboard to use UUID user_id

BEGIN;

-- Step 1: Add new columns to reports table
ALTER TABLE IF EXISTS public.reports
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Step 2: Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_user_id_status ON public.reports(user_id, status);

-- Step 3: Migrate leaderboard.user_id from TEXT to UUID
-- First, drop the existing foreign key constraint
ALTER TABLE IF EXISTS public.leaderboard
DROP CONSTRAINT IF EXISTS leaderboard_user_id_fkey;

-- Create a temporary column to hold UUID values
ALTER TABLE IF EXISTS public.leaderboard
ADD COLUMN IF NOT EXISTS user_id_temp UUID;

-- Populate temp column by joining with user_profiles and extracting auth_user_id
UPDATE public.leaderboard lb
SET user_id_temp = up.auth_user_id
FROM public.user_profiles up
WHERE lb.user_id = up.id;

-- Drop the old TEXT user_id column
ALTER TABLE IF EXISTS public.leaderboard
DROP COLUMN IF EXISTS user_id;

-- Rename temp column to user_id
ALTER TABLE IF EXISTS public.leaderboard
RENAME COLUMN user_id_temp TO user_id;

-- Add NOT NULL constraint and foreign key
ALTER TABLE IF EXISTS public.leaderboard
ALTER COLUMN user_id SET NOT NULL,
ADD CONSTRAINT leaderboard_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
ADD CONSTRAINT leaderboard_user_id_unique UNIQUE (user_id);

-- Step 4: Update leaderboard indexes
DROP INDEX IF EXISTS idx_leaderboard_user_id;
CREATE INDEX IF NOT EXISTS idx_leaderboard_user_id ON public.leaderboard(user_id);

-- Verify the migration
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'reports' AND column_name IN ('user_id', 'verified', 'image_url');

COMMIT;
