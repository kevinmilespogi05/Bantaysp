-- Create pending_registrations table for deferred user creation
-- This table stores incomplete registration data during the 3-step registration process
-- Records are automatically deleted after successful verification or manually if abandoned

CREATE TABLE IF NOT EXISTS public.pending_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  barangay TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'resident',
  id_document_url TEXT,
  otp_code TEXT NOT NULL,
  otp_created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indices for fast lookups
CREATE INDEX IF NOT EXISTS idx_pending_registrations_email ON public.pending_registrations(email);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_otp_code ON public.pending_registrations(otp_code);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_created_at ON public.pending_registrations(created_at);

-- Enable RLS (deny all by default)
ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;

-- No public read access (internal service use only)
-- Backend functions run with service role, so no RLS policies needed for service access

COMMENT ON TABLE public.pending_registrations IS 'Temporary storage for incomplete 3-step registrations. Auto-cleaned after 24+ hours. All timestamps in UTC.';
COMMENT ON COLUMN public.pending_registrations.otp_created_at IS 'Timestamp when OTP was generated (UTC). Valid for 15 minutes + 30-second clock skew tolerance.';

