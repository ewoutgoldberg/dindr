
-- Fix profiles invite_code exposure: restrict reads to self + partner
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;
CREATE POLICY "Users view self and partner profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR id = public.get_partner(auth.uid()));

-- Revoke column-level access to claim_token on food_creators
REVOKE SELECT (claim_token) ON public.food_creators FROM anon, authenticated;
