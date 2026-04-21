INSERT INTO storage.buckets (id, name, public) VALUES ('lovable-uploads', 'lovable-uploads', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read lovable-uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'lovable-uploads');

CREATE POLICY "Admins write lovable-uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lovable-uploads' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update lovable-uploads"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'lovable-uploads' AND has_role(auth.uid(), 'admin'::app_role));