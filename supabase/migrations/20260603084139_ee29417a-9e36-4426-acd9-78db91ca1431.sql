CREATE OR REPLACE FUNCTION public.set_claim_token()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.claim_token IS NULL THEN
    NEW.claim_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_set_claim_token ON public.food_creators;
CREATE TRIGGER trg_set_claim_token
BEFORE INSERT ON public.food_creators
FOR EACH ROW EXECUTE FUNCTION public.set_claim_token();