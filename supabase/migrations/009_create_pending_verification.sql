-- Migration 009: Create pending_verification table for admin verification workflow
-- After users complete OTP verification, they are stored here pending admin approval
-- Only after admin approves should they be moved to user_profiles

CREATE TABLE IF NOT EXISTS pending_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  role text NOT NULL DEFAULT 'resident',
  barangay text,
  avatar text,
  id_document_url text,
  verification_status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_pending_verification_user_id 
  ON pending_verification(user_id);

-- Index for faster lookups by email
CREATE INDEX IF NOT EXISTS idx_pending_verification_email 
  ON pending_verification(email);

-- Index for querying by verification status
CREATE INDEX IF NOT EXISTS idx_pending_verification_status 
  ON pending_verification(verification_status);
