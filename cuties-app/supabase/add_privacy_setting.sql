-- Add privacy_setting column to users table
-- This column controls who can discover the user's profile:
-- 'public' - Anyone can find and view the profile in the directory
-- 'email_only' - Only people who know the user's email can find them
-- 'communities_only' - Only visible to members of the user's communities

ALTER TABLE users
ADD COLUMN IF NOT EXISTS privacy_setting TEXT DEFAULT 'public'
CHECK (privacy_setting IN ('public', 'email_only', 'communities_only'));

-- Add an index for faster filtering by privacy setting
CREATE INDEX IF NOT EXISTS idx_users_privacy_setting ON users(privacy_setting);

-- Comment for documentation
COMMENT ON COLUMN users.privacy_setting IS 'Controls profile visibility: public, email_only, or communities_only';
