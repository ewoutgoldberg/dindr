
-- 1. Tighten EXECUTE on SECURITY DEFINER helper functions
REVOKE EXECUTE ON FUNCTION public.generate_invite_code() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.auto_favorite_on_match() FROM anon, authenticated, public;
-- has_role and get_partner are referenced by RLS policies evaluated as the authenticated role.
-- Keep EXECUTE for authenticated, but revoke from anon.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_partner(uuid) FROM anon, public;

-- 2. Explicit restrictive policy on user_roles to make privilege-escalation intent clear
CREATE POLICY "Block client writes to user_roles"
  ON public.user_roles
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- 3. Admin-scoped DELETE policy for lovable-uploads bucket
CREATE POLICY "Admins delete lovable-uploads"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'lovable-uploads' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4. Restrict SELECT (listing) on lovable-uploads to admins.
-- Public URL access (/object/public/...) bypasses RLS, so images still load.
DROP POLICY IF EXISTS "Public read lovable-uploads" ON storage.objects;
CREATE POLICY "Admins list lovable-uploads"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'lovable-uploads' AND public.has_role(auth.uid(), 'admin'::public.app_role));
