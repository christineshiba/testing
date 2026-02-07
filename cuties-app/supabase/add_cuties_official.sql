-- Add is_cuties_official column to communities table
-- This distinguishes between Cuties platform communities and personal communities

ALTER TABLE communities
ADD COLUMN IF NOT EXISTS is_cuties_official BOOLEAN DEFAULT false;

-- Set all existing communities as Cuties official
UPDATE communities SET is_cuties_official = true WHERE is_cuties_official IS NULL OR is_cuties_official = false;

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_communities_cuties_official ON communities(is_cuties_official);
