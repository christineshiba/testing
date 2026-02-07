-- Add threading support to posts and channel messages

-- ============================================
-- ADD THREAD SUPPORT TO COMMUNITY POSTS
-- ============================================
ALTER TABLE community_posts
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES community_posts(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_community_posts_parent ON community_posts(parent_id);

-- ============================================
-- ADD THREAD SUPPORT TO CHANNEL MESSAGES
-- ============================================
ALTER TABLE channel_messages
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES channel_messages(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_channel_messages_parent ON channel_messages(parent_id);
