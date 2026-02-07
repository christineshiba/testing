-- Add question column for user profile prompts
-- This stores the custom question/prompt users can set for others to answer

ALTER TABLE users ADD COLUMN IF NOT EXISTS question TEXT;

-- Add index for potential searching by question
-- CREATE INDEX IF NOT EXISTS idx_users_question ON users(question);

COMMENT ON COLUMN users.question IS 'Custom prompt/question for profile visitors to answer when reaching out';
