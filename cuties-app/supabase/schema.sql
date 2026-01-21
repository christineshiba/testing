-- Cuties App PostgreSQL Schema for Supabase
-- Migrated from Bubble.io database
--
-- Cuties Key (field name translations):
--   Lovers = Lemons (mutual romantic interest)
--   Raspberriedby = Rejected by
--   Raspberries = Rejected Suitors
--   Hidden sweets = Hidden Suitors
--   Kiwis = Friends
--   Bananas = Interested in
--   Melons = Met up
--   Sweets = Suitors (people interested in user)
--   Watermelons = Vouchers
--   Pantry = Hidden by

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bubble_id TEXT UNIQUE, -- Original Bubble ID from "Additional Links" field
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE, -- Extracted from other tables where they appear as Creator
    age INTEGER,
    short_description TEXT,
    background_color TEXT,
    consent BOOLEAN DEFAULT FALSE,

    -- Relationship arrays (stored as comma-separated in Bubble, normalized later)
    collaborators TEXT[], -- "Collabs" field
    communities TEXT[], -- "Communities" field

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- ============================================
-- USER LINKS (Social media, websites, etc.)
-- ============================================
CREATE TABLE user_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_links_user_id ON user_links(user_id);

-- ============================================
-- PROJECTS (User portfolio/projects)
-- ============================================
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    link TEXT,
    photo_url TEXT,
    display_order INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_user_id ON projects(user_id);

-- ============================================
-- VIDEOS (User profile videos)
-- ============================================
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_videos_user_id ON videos(user_id);

-- ============================================
-- LIKES / INTERESTS
-- "Bananas" = Interested in (sender is interested in receiver)
-- "Sweets/Suitors" = People interested in user (inverse)
-- ============================================
CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate likes
    UNIQUE(sender_id, receiver_id)
);

CREATE INDEX idx_likes_sender ON likes(sender_id);
CREATE INDEX idx_likes_receiver ON likes(receiver_id);

-- View: Mutual likes (Lovers/Lemons)
CREATE VIEW mutual_likes AS
SELECT
    l1.sender_id AS user1_id,
    l1.receiver_id AS user2_id,
    LEAST(l1.created_at, l2.created_at) AS matched_at
FROM likes l1
INNER JOIN likes l2
    ON l1.sender_id = l2.receiver_id
    AND l1.receiver_id = l2.sender_id
WHERE l1.sender_id < l1.receiver_id; -- Prevent duplicates

-- ============================================
-- MET UPS (Melons)
-- Records when two users have met in person
-- ============================================
CREATE TABLE met_ups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user1_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user2_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate meetups
    UNIQUE(user1_id, user2_id)
);

CREATE INDEX idx_met_ups_user1 ON met_ups(user1_id);
CREATE INDEX idx_met_ups_user2 ON met_ups(user2_id);

-- ============================================
-- MESSAGES
-- Direct messages between users
-- ============================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    recipient_id UUID REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- ============================================
-- FRIEND TESTIMONIALS
-- Testimonials users write for their friends
-- ============================================
CREATE TABLE friend_testimonials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    subject_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_friend_testimonials_author ON friend_testimonials(author_id);
CREATE INDEX idx_friend_testimonials_subject ON friend_testimonials(subject_id);

-- ============================================
-- APP TESTIMONIALS
-- Testimonials about the app itself
-- ============================================
CREATE TABLE app_testimonials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    username TEXT, -- Display name/handle
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_app_testimonials_author ON app_testimonials(author_id);

-- ============================================
-- PAIRINGS (Matchmaking suggestions)
-- External matchmaking/introductions
-- ============================================
CREATE TABLE pairings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match1_id UUID REFERENCES users(id) ON DELETE SET NULL,
    match2_id UUID REFERENCES users(id) ON DELETE SET NULL,
    match1_name TEXT, -- Fallback if user not in system
    match2_name TEXT, -- Fallback if user not in system
    match2_alt_name TEXT,
    contact_info TEXT,
    description TEXT,
    here_for TEXT[], -- Array: 'Love', 'Friends', 'Collaboration'
    anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- HIDDEN USERS (Pantry / Hidden sweets)
-- Users can hide other users from their view
-- ============================================
CREATE TABLE hidden_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    hidden_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, hidden_user_id)
);

CREATE INDEX idx_hidden_users_user ON hidden_users(user_id);

-- ============================================
-- REJECTIONS (Raspberries)
-- Track when users reject/pass on others
-- ============================================
CREATE TABLE rejections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rejector_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rejected_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(rejector_id, rejected_id)
);

CREATE INDEX idx_rejections_rejector ON rejections(rejector_id);
CREATE INDEX idx_rejections_rejected ON rejections(rejected_id);

-- ============================================
-- FRIENDSHIPS (Kiwis)
-- Mutual friendship connections
-- ============================================
CREATE TABLE friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user1_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user2_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure user1_id < user2_id to prevent duplicates
    UNIQUE(user1_id, user2_id),
    CHECK (user1_id < user2_id)
);

CREATE INDEX idx_friendships_user1 ON friendships(user1_id);
CREATE INDEX idx_friendships_user2 ON friendships(user2_id);

-- ============================================
-- VOUCHES (Watermelons)
-- Users vouching for other users
-- ============================================
CREATE TABLE vouches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_id UUID REFERENCES users(id) ON DELETE CASCADE,
    vouchee_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(voucher_id, vouchee_id)
);

CREATE INDEX idx_vouches_voucher ON vouches(voucher_id);
CREATE INDEX idx_vouches_vouchee ON vouches(vouchee_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE met_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE pairings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hidden_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rejections ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouches ENABLE ROW LEVEL SECURITY;

-- Users can read all profiles (public directory)
CREATE POLICY "Profiles are viewable by everyone" ON users
    FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- User links policies
CREATE POLICY "User links are viewable by everyone" ON user_links
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own links" ON user_links
    FOR ALL USING (auth.uid() = user_id);

-- Projects policies
CREATE POLICY "Projects are viewable by everyone" ON projects
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own projects" ON projects
    FOR ALL USING (auth.uid() = user_id);

-- Videos policies
CREATE POLICY "Videos are viewable by everyone" ON videos
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own videos" ON videos
    FOR ALL USING (auth.uid() = user_id);

-- Likes policies
CREATE POLICY "Users can see likes they sent or received" ON likes
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create likes" ON likes
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can delete own likes" ON likes
    FOR DELETE USING (auth.uid() = sender_id);

-- Messages policies
CREATE POLICY "Users can see own messages" ON messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages" ON messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Friend testimonials policies
CREATE POLICY "Testimonials are viewable by everyone" ON friend_testimonials
    FOR SELECT USING (true);

CREATE POLICY "Users can write testimonials" ON friend_testimonials
    FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can edit own testimonials" ON friend_testimonials
    FOR UPDATE USING (auth.uid() = author_id);

-- App testimonials are public
CREATE POLICY "App testimonials are viewable by everyone" ON app_testimonials
    FOR SELECT USING (true);

-- Met ups policies
CREATE POLICY "Users can see own meetups" ON met_ups
    FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can record meetups" ON met_ups
    FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Hidden users policies (private)
CREATE POLICY "Users can manage own hidden list" ON hidden_users
    FOR ALL USING (auth.uid() = user_id);

-- Rejections policies (private)
CREATE POLICY "Users can manage own rejections" ON rejections
    FOR ALL USING (auth.uid() = rejector_id);

-- Friendships policies
CREATE POLICY "Users can see own friendships" ON friendships
    FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Vouches policies
CREATE POLICY "Vouches are viewable by everyone" ON vouches
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own vouches" ON vouches
    FOR ALL USING (auth.uid() = voucher_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get user's suitors (people who liked them)
CREATE OR REPLACE FUNCTION get_suitors(user_uuid UUID)
RETURNS TABLE(suitor_id UUID, liked_at TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY
    SELECT sender_id, created_at
    FROM likes
    WHERE receiver_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's interests (people they liked)
CREATE OR REPLACE FUNCTION get_interests(user_uuid UUID)
RETURNS TABLE(interest_id UUID, liked_at TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY
    SELECT receiver_id, created_at
    FROM likes
    WHERE sender_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get mutual matches (Lovers/Lemons)
CREATE OR REPLACE FUNCTION get_matches(user_uuid UUID)
RETURNS TABLE(match_id UUID, matched_at TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE WHEN user1_id = user_uuid THEN user2_id ELSE user1_id END,
        matched_at
    FROM mutual_likes
    WHERE user1_id = user_uuid OR user2_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_links_updated_at BEFORE UPDATE ON user_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_friend_testimonials_updated_at BEFORE UPDATE ON friend_testimonials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_testimonials_updated_at BEFORE UPDATE ON app_testimonials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
