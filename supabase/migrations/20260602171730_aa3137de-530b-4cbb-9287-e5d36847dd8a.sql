
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'lovable-uploads'
  AND name LIKE 'avatars/' || auth.uid()::text || '-%'
)
WITH CHECK (
  bucket_id = 'lovable-uploads'
  AND name LIKE 'avatars/' || auth.uid()::text || '-%'
);

CREATE POLICY "Users can read own avatar"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'lovable-uploads'
  AND name LIKE 'avatars/' || auth.uid()::text || '-%'
);
