-- Add DELETE policy for communities table
-- Allows admins and moderators to delete communities

-- Drop existing policy if it exists (to allow re-running)
DROP POLICY IF EXISTS "Community admins and moderators can delete communities" ON communities;

-- Create the delete policy
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
