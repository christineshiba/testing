-- Create the "main" community if it doesn't exist
INSERT INTO communities (id, name, slug, description, is_private, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'main',
  'main',
  'The main community for all cuties members',
  false,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- Add all existing users to the main community (as members)
INSERT INTO community_members (community_id, user_id, role, joined_at)
SELECT
  'a0000000-0000-0000-0000-000000000001',
  u.id,
  'member',
  NOW()
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM community_members cm
  WHERE cm.community_id = 'a0000000-0000-0000-0000-000000000001'
  AND cm.user_id = u.id
);

-- Verify the setup
SELECT
  c.name as community_name,
  COUNT(cm.user_id) as member_count
FROM communities c
LEFT JOIN community_members cm ON c.id = cm.community_id
WHERE c.slug = 'main'
GROUP BY c.name;
