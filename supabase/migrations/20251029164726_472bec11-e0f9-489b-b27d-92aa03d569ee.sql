-- Create storage bucket for wager proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('wager-proofs', 'wager-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own wager proof screenshots
CREATE POLICY "Users can upload their own wager proofs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'wager-proofs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access so AI can verify screenshots
CREATE POLICY "Public read access for wager proofs"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'wager-proofs');

-- Allow users to delete their own screenshots
CREATE POLICY "Users can delete their own wager proofs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'wager-proofs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);