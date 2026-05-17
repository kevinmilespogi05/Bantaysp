-- Add user_id column to patrol_units table to link to actual auth users
-- This fixes the UUID mismatch bug in patrol assignments

ALTER TABLE public.patrol_units
ADD COLUMN user_id UUID UNIQUE;

-- Create index for faster lookups
CREATE INDEX idx_patrol_units_user_id ON public.patrol_units(user_id);

-- Add comment explaining the field
COMMENT ON COLUMN public.patrol_units.user_id IS 'Reference to auth.users.id - the actual patrol officer user account';
