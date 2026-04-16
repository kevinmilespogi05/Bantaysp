-- Add location coordinates to reports table
-- This migration adds lat/lng columns for precise geolocation

-- Add location_lat and location_lng columns to reports table
ALTER TABLE public.reports
  ADD COLUMN location_lat FLOAT DEFAULT NULL,
  ADD COLUMN location_lng FLOAT DEFAULT NULL;

-- Set default coordinates for Olongapo, Philippines if location is provided
UPDATE public.reports 
SET 
  location_lat = 14.3955,
  location_lng = 120.2854
WHERE location_lat IS NULL 
  AND location_lng IS NULL 
  AND location IS NOT NULL;

-- Create index for geospatial queries
CREATE INDEX IF NOT EXISTS idx_reports_location ON reports(location_lat, location_lng);

-- Add comment to explain the new columns
COMMENT ON COLUMN public.reports.location_lat IS 'Latitude coordinate for the report location (default: Olongapo)';
COMMENT ON COLUMN public.reports.location_lng IS 'Longitude coordinate for the report location (default: Olongapo)';
