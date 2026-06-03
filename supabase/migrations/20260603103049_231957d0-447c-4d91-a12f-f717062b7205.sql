
-- =========================================================
-- 1) Hide claim_token from broad SELECT on food_creators
-- =========================================================
REVOKE SELECT (claim_token) ON public.food_creators FROM anon, authenticated;

-- Secure function: get claim link token (admin only)
CREATE OR REPLACE FUNCTION public.get_creator_claim_token(_creator_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tok text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT claim_token INTO tok FROM public.food_creators WHERE id = _creator_id;
  RETURN tok;
END;
$$;

-- Secure function: lookup creator by claim_token for the Claim page
CREATE OR REPLACE FUNCTION public.get_creator_by_claim_token(_token text)
RETURNS public.food_creators
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.food_creators;
BEGIN
  SELECT * INTO rec FROM public.food_creators WHERE claim_token = _token LIMIT 1;
  RETURN rec;
END;
$$;

-- =========================================================
-- 2) Partnerships: require knowing the other party's invite code
-- =========================================================
DROP POLICY IF EXISTS "Members create partnership" ON public.partnerships;

CREATE OR REPLACE FUNCTION public.connect_partner_by_code(_invite_code text)
RETURNS public.partnerships
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  target uuid;
  a uuid;
  b uuid;
  rec public.partnerships;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO target FROM public.profiles WHERE invite_code = upper(_invite_code) LIMIT 1;
  IF target IS NULL THEN
    RAISE EXCEPTION 'Invalid code';
  END IF;
  IF target = me THEN
    RAISE EXCEPTION 'Cannot connect with yourself';
  END IF;

  -- Already partnered?
  IF EXISTS (SELECT 1 FROM public.partnerships
             WHERE user_a IN (me, target) OR user_b IN (me, target)) THEN
    RAISE EXCEPTION 'One of the users is already in a partnership';
  END IF;

  IF me < target THEN a := me; b := target; ELSE a := target; b := me; END IF;

  INSERT INTO public.partnerships (user_a, user_b) VALUES (a, b) RETURNING * INTO rec;
  RETURN rec;
END;
$$;

-- =========================================================
-- 3) Restrict SECURITY DEFINER functions from anon execution
-- =========================================================
REVOKE EXECUTE ON FUNCTION public.claim_creator(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_partner(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_creator_claim_token(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_creator_by_claim_token(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.connect_partner_by_code(text) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.claim_creator(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_partner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_claim_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_by_claim_token(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.connect_partner_by_code(text) TO authenticated;
