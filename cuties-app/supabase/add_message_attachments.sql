-- Add attachments column to channel_messages
ALTER TABLE channel_messages
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT NULL;

-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to message attachments
CREATE POLICY "Public Access to message attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'message-attachments');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload message attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'message-attachments');

-- Allow users to delete their own attachments
CREATE POLICY "Users can delete own message attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'message-attachments');
