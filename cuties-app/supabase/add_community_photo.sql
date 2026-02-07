-- Add photo_url column to communities table
ALTER TABLE communities ADD COLUMN IF NOT EXISTS photo_url TEXT;
