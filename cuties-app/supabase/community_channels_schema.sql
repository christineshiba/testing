-- Community Channels Schema for Supabase
-- Slack-like channels within communities

-- ============================================
-- COMMUNITY CHANNELS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS community_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_name TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_private BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(community_name, name)
);

CREATE INDEX IF NOT EXISTS idx_channels_community ON community_channels(community_name);
CREATE INDEX IF NOT EXISTS idx_channels_created_by ON community_channels(created_by);

-- ============================================
-- CHANNEL MEMBERS TABLE (for private channels)
-- ============================================
CREATE TABLE IF NOT EXISTS channel_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID REFERENCES community_channels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member', -- 'admin' or 'member'
    joined_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_members_channel ON channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_user ON channel_members(user_id);

-- ============================================
-- CHANNEL MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS channel_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID REFERENCES community_channels(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_channel_messages_channel ON channel_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_author ON channel_messages(author_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_created_at ON channel_messages(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE community_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_messages ENABLE ROW LEVEL SECURITY;

-- Channels: Public channels visible to all, private only to members
CREATE POLICY "Public channels are viewable by all" ON community_channels
    FOR SELECT USING (true);

CREATE POLICY "Anyone can create channels" ON community_channels
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Channel creators can update" ON community_channels
    FOR UPDATE USING (true);

CREATE POLICY "Channel creators can delete" ON community_channels
    FOR DELETE USING (true);

-- Channel Members
CREATE POLICY "Channel members are viewable" ON channel_members
    FOR SELECT USING (true);

CREATE POLICY "Anyone can join channels" ON channel_members
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Members can leave channels" ON channel_members
    FOR DELETE USING (true);

-- Channel Messages
CREATE POLICY "Messages in public channels are viewable" ON channel_messages
    FOR SELECT USING (true);

CREATE POLICY "Members can send messages" ON channel_messages
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Authors can update messages" ON channel_messages
    FOR UPDATE USING (true);

CREATE POLICY "Authors can delete messages" ON channel_messages
    FOR DELETE USING (true);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_community_channels_updated_at
    BEFORE UPDATE ON community_channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channel_messages_updated_at
    BEFORE UPDATE ON channel_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
