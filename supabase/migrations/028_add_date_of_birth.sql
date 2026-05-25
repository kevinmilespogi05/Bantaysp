-- Migration 028: Add date_of_birth field to pending_verification and user_profiles
-- This allows residents to provide their date of birth during registration
-- and display their computed age on their profile page

-- Add date_of_birth to pending_verification (stores during registration flow)
ALTER TABLE public.pending_verification
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Add date_of_birth to user_profiles (stores after admin approval)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;

COMMENT ON COLUMN public.pending_verification.date_of_birth IS 'Resident date of birth, used to compute age on profile.';
COMMENT ON COLUMN public.user_profiles.date_of_birth IS 'Resident date of birth, used to compute age on profile.';
