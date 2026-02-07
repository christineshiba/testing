-- Add pricing/membership fields to communities table
-- For semi-public and private communities that want to charge for access

ALTER TABLE communities
ADD COLUMN IF NOT EXISTS has_paid_membership BOOLEAN DEFAULT false;

ALTER TABLE communities
ADD COLUMN IF NOT EXISTS membership_type TEXT CHECK (membership_type IN ('one_time', 'subscription'));

ALTER TABLE communities
ADD COLUMN IF NOT EXISTS membership_price DECIMAL(10, 2);

ALTER TABLE communities
ADD COLUMN IF NOT EXISTS membership_currency TEXT DEFAULT 'USD';

ALTER TABLE communities
ADD COLUMN IF NOT EXISTS subscription_interval TEXT CHECK (subscription_interval IN ('monthly', 'yearly'));

-- Create index for filtering paid communities
CREATE INDEX IF NOT EXISTS idx_communities_paid_membership ON communities(has_paid_membership);

COMMENT ON COLUMN communities.has_paid_membership IS 'Whether this community requires payment to join';
COMMENT ON COLUMN communities.membership_type IS 'one_time = pay once for approval, subscription = recurring payment';
COMMENT ON COLUMN communities.membership_price IS 'Price in the specified currency';
COMMENT ON COLUMN communities.membership_currency IS 'Currency code (default USD)';
COMMENT ON COLUMN communities.subscription_interval IS 'For subscriptions: monthly or yearly';
