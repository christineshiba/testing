-- Add projects_json column to users table for storing projects as JSON
-- This avoids the RLS policy issue with the separate projects table

ALTER TABLE users ADD COLUMN IF NOT EXISTS projects_json JSONB DEFAULT '[]';

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_projects_json ON users USING GIN (projects_json);
