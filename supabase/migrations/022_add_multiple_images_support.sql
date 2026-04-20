-- Add support for multiple images per report
-- Migration: 022_add_multiple_images_support.sql
-- Created: 2026-04-19

ALTER TABLE reports ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT NULL;

-- Create index on image_urls for better query performance
CREATE INDEX IF NOT EXISTS idx_reports_image_urls ON reports USING GIN(image_urls);

-- Add comment explaining the field
COMMENT ON COLUMN reports.image_urls IS 'Array of image URLs for reports with multiple images. The first image should also be in image_url for backwards compatibility.';
