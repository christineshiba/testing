-- Add is_cuties_official column to communities table
-- This column indicates whether a community is an official Cuties platform community
-- or a personal community created by a user

ALTER TABLE communities
ADD COLUMN IF NOT EXISTS is_cuties_official BOOLEAN DEFAULT false;

-- Update existing communities created before this migration
-- All existing communities will be marked as non-official by default
-- You can manually update specific communities to be official if needed:
-- UPDATE communities SET is_cuties_official = true WHERE slug IN ('community-slug-1', 'community-slug-2');
