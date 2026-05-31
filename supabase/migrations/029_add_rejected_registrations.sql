-- Migration 029: Create rejected_registrations table
-- Stores the rejection reason when an admin rejects a pending user registration.
-- This allows the user to see WHY their registration was rejected when they try to log in.
-- Records are cleared when the user successfully re-registers.

CREATE TABLE IF NOT EXISTS public.rejected_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  rejection_reason TEXT NOT NULL,
  rejected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  re_registered_at TIMESTAMP WITH TIME ZONE -- set when user begins re-registration
);

-- Unique index on email so we can do fast lookups and upserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_rejected_registrations_email
  ON public.rejected_registrations(email);

-- Index for timestamp-based cleanup queries
CREATE INDEX IF NOT EXISTS idx_rejected_registrations_rejected_at
  ON public.rejected_registrations(rejected_at);

-- Enable RLS (deny all by default — only service role can access)
ALTER TABLE public.rejected_registrations ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.rejected_registrations IS
  'Stores rejection reasons for admin-rejected registration requests. '
  'Records are removed when the user re-registers. '
  'Used to display a rejection notification on the login page.';

COMMENT ON COLUMN public.rejected_registrations.rejection_reason IS
  'Human-readable reason provided by the admin when rejecting the registration.';

COMMENT ON COLUMN public.rejected_registrations.re_registered_at IS
  'Timestamp when the user began re-registration with this email. '
  'The record is deleted once re-registration starts.';
