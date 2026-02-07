-- ============================================
-- COMMUNITIES SCHEMA
-- ============================================
-- Tables for community creation and management

-- Communities table - stores community metadata
CREATE TABLE IF NOT EXISTS communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  photo_url TEXT,
  is_private BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add photo_url column if it doesn't exist (for existing databases)
ALTER TABLE communities ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Community members table - tracks membership with roles
CREATE TABLE IF NOT EXISTS community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

-- Community invites table - tracks invite codes
CREATE TABLE IF NOT EXISTS community_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER,
  use_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_communities_slug ON communities(slug);
CREATE INDEX IF NOT EXISTS idx_communities_created_by ON communities(created_by);
CREATE INDEX IF NOT EXISTS idx_community_members_community_id ON community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user_id ON community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_invites_code ON community_invites(code);
CREATE INDEX IF NOT EXISTS idx_community_invites_community_id ON community_invites(community_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_communities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS communities_updated_at ON communities;
CREATE TRIGGER communities_updated_at
  BEFORE UPDATE ON communities
  FOR EACH ROW
  EXECUTE FUNCTION update_communities_updated_at();

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS only on communities table
-- (community_members and community_invites have RLS disabled to avoid recursion)
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

-- Communities policies
-- Anyone can view public communities
CREATE POLICY "Public communities are viewable by everyone"
  ON communities FOR SELECT
  USING (is_private = false);

-- Private communities are viewable by members
CREATE POLICY "Private communities are viewable by members"
  ON communities FOR SELECT
  USING (
    is_private = true AND
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = communities.id
      AND community_members.user_id = auth.uid()
    )
  );

-- Authenticated users can create communities
CREATE POLICY "Authenticated users can create communities"
  ON communities FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Community admins can update their communities
CREATE POLICY "Community admins can update their communities"
  ON communities FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = communities.id
      AND community_members.user_id = auth.uid()
      AND community_members.role = 'admin'
    )
  );

-- Community admins and moderators can delete their communities
CREATE POLICY "Community admins and moderators can delete communities"
  ON communities FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = communities.id
      AND community_members.user_id = auth.uid()
      AND community_members.role IN ('admin', 'moderator')
    )
  );

-- Note: community_members and community_invites do not have RLS enabled
-- to avoid infinite recursion issues with self-referencing policies
