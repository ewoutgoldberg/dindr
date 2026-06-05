
-- 1. Revoke column-level SELECT on food_creators.claim_token from public roles
REVOKE SELECT (claim_token) ON public.food_creators FROM anon, authenticated;
-- service_role and SECURITY DEFINER functions retain access

-- 2. Revoke EXECUTE from anon on SECURITY DEFINER functions that should not be callable unauthenticated
REVOKE EXECUTE ON FUNCTION public.claim_creator(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_creator_by_claim_token(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_creator_claim_token(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.connect_partner_by_code(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_partner(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.claim_creator(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_by_claim_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_claim_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.connect_partner_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_partner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
