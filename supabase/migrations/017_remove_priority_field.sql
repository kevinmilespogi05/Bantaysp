-- Migration 017: Remove Priority Field
-- Removes the priority field from reports, patrol_incidents, and patrol_history tables

BEGIN;

-- Drop the priority constraint first
ALTER TABLE IF EXISTS public.reports
DROP CONSTRAINT IF EXISTS reports_priority_check;

-- Drop the priority column from reports
ALTER TABLE IF EXISTS public.reports
DROP COLUMN IF EXISTS priority;

-- Drop the priority constraint from patrol_incidents if it exists
ALTER TABLE IF EXISTS public.patrol_incidents
DROP CONSTRAINT IF EXISTS patrol_incidents_priority_check;

-- Drop the priority column from patrol_incidents
ALTER TABLE IF EXISTS public.patrol_incidents
DROP COLUMN IF EXISTS priority;

-- Drop the priority column from patrol_history
ALTER TABLE IF EXISTS public.patrol_history
DROP COLUMN IF EXISTS priority;

COMMIT;
