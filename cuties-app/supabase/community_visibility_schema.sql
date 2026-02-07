-- ============================================
-- COMMUNITY VISIBILITY AND JOIN REQUESTS
-- ============================================
-- Migration to add visibility types and approval system

-- Add visibility column to communities table
-- Values: 'public', 'semi-public', 'private'
ALTER TABLE communities ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'semi-public', 'private'));

-- Migrate existing is_private data to visibility
UPDATE communities SET visibility = 'private' WHERE is_private = true;
UPDATE communities SET visibility = 'public' WHERE is_private = false OR is_private IS NULL;

-- Create community_join_requests table for semi-public approval flow
CREATE TABLE IF NOT EXISTS community_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT, -- Optional message from applicant
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_join_requests_community_id ON community_join_requests(community_id);
CREATE INDEX IF NOT EXISTS idx_community_join_requests_user_id ON community_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_community_join_requests_status ON community_join_requests(status);
CREATE INDEX IF NOT EXISTS idx_communities_visibility ON communities(visibility);

-- ============================================
-- UPDATED ROW LEVEL SECURITY POLICIES
-- ============================================

-- Drop existing policies to recreate with new visibility logic
DROP POLICY IF EXISTS "Public communities are viewable by everyone" ON communities;
DROP POLICY IF EXISTS "Private communities are viewable by members" ON communities;

-- Public and semi-public communities are viewable by everyone
CREATE POLICY "Public and semi-public communities are viewable by everyone"
  ON communities FOR SELECT
  USING (visibility IN ('public', 'semi-public'));

-- Private communities are viewable only by members
CREATE POLICY "Private communities are viewable only by members"
  ON communities FOR SELECT
  USING (
    visibility = 'private' AND
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = communities.id
      AND community_members.user_id = auth.uid()
    )
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if a user has a pending join request
CREATE OR REPLACE FUNCTION has_pending_join_request(p_community_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM community_join_requests
    WHERE community_id = p_community_id
    AND user_id = p_user_id
    AND status = 'pending'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get pending join requests count for a community
CREATE OR REPLACE FUNCTION get_pending_requests_count(p_community_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER FROM community_join_requests
    WHERE community_id = p_community_id
    AND status = 'pending'
  );
END;
$$ LANGUAGE plpgsql;
