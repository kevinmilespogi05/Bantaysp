-- Add JSON field to store multiple image URLs
-- Migration: 023_add_images_json_field.sql
-- Created: 2026-04-19
-- Fallback for when image_urls array column is not available

ALTER TABLE reports ADD COLUMN IF NOT EXISTS images_json TEXT DEFAULT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN reports.images_json IS 'JSON array of image URLs for reports with multiple images. Format: ["url1", "url2", ...]';
