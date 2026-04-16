-- Migration 006: Add OTP and Email Verification fields to user_profiles
-- Purpose: Support 2-tier email verification (OTP + admin approval)
-- Note: All timestamp columns use TIMESTAMP WITH TIME ZONE for explicit UTC handling

BEGIN;

-- Add new columns to user_profiles table (only if they don't exist)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS phone TEXT NULL,
ADD COLUMN IF NOT EXISTS id_document_url TEXT NULL,
ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'approved')),
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS otp_code TEXT NULL,
ADD COLUMN IF NOT EXISTS otp_created_at TIMESTAMP WITH TIME ZONE NULL;

-- Add constraint (only if it doesn't exist - using exception handling)
DO $$
BEGIN
  ALTER TABLE user_profiles
  ADD CONSTRAINT otp_consistency CHECK (
    (otp_code IS NULL AND otp_created_at IS NULL) OR
    (otp_code IS NOT NULL AND otp_created_at IS NOT NULL)
  );
EXCEPTION WHEN duplicate_object THEN
  -- Constraint already exists, ignore error
  NULL;
END $$;

-- Create index on otp_code for quick lookups during verification (only if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_user_profiles_otp_code ON user_profiles(otp_code) WHERE otp_code IS NOT NULL;

-- Create index on email for OTP lookups (commonly needed for resend/verify)
CREATE INDEX IF NOT EXISTS idx_user_profiles_email_otp ON user_profiles(email) WHERE email_verified = FALSE;

COMMIT;
