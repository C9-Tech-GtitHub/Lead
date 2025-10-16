-- Migration: Add latitude and longitude to leads table
-- Date: 2025-10-16
-- Description: Adds GPS coordinates to enable map visualization

-- Add latitude and longitude columns
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Create a spatial index for efficient location queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_leads_coordinates ON leads(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add a comment to document the columns
COMMENT ON COLUMN leads.latitude IS 'GPS latitude coordinate from Google Maps';
COMMENT ON COLUMN leads.longitude IS 'GPS longitude coordinate from Google Maps';
