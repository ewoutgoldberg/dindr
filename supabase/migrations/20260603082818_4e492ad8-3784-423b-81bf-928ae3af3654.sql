
-- food_creators: status & claim fields
ALTER TABLE public.food_creators
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'unclaimed',
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS claim_token text,
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS badge_new boolean NOT NULL DEFAULT true;

-- status check
DO $$ BEGIN
  ALTER TABLE public.food_creators
    ADD CONSTRAINT food_creators_status_check
    CHECK (status IN ('unclaimed','invited','claimed','verified'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- existing rows = verified
UPDATE public.food_creators
  SET status = 'verified', verified_at = COALESCE(verified_at, now()), badge_new = false
  WHERE status = 'unclaimed';

-- ensure claim_token uniqueness + auto-generate
CREATE UNIQUE INDEX IF NOT EXISTS food_creators_claim_token_uniq
  ON public.food_creators(claim_token) WHERE claim_token IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS food_creators_user_id_uniq
  ON public.food_creators(user_id) WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_claim_token()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.claim_token IS NULL THEN
    NEW.claim_token := encode(gen_random_bytes(18), 'hex');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_claim_token ON public.food_creators;
CREATE TRIGGER trg_set_claim_token BEFORE INSERT ON public.food_creators
  FOR EACH ROW EXECUTE FUNCTION public.set_claim_token();

-- backfill tokens
UPDATE public.food_creators SET claim_token = encode(gen_random_bytes(18),'hex')
WHERE claim_token IS NULL;

-- recipes: source & publish
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS content_source text NOT NULL DEFAULT 'admin_created',
  ADD COLUMN IF NOT EXISTS creator_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TABLE public.recipes
    ADD CONSTRAINT recipes_content_source_check
    CHECK (content_source IN ('admin_created','creator_created','imported'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- existing recipes considered published & approved
UPDATE public.recipes SET published = true, creator_approved = true WHERE published = false;

-- RLS: creators can update own profile
DROP POLICY IF EXISTS "Creators update own profile" ON public.food_creators;
CREATE POLICY "Creators update own profile" ON public.food_creators
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS: recipes — replace public select with published-only (admins keep ALL via existing policy)
DROP POLICY IF EXISTS "Recipes are public to authenticated" ON public.recipes;
CREATE POLICY "Published recipes viewable" ON public.recipes
  FOR SELECT TO authenticated
  USING (
    published = true
    OR has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.food_creators c WHERE c.id = recipes.creator_id AND c.user_id = auth.uid())
  );

-- RLS: creators can update/insert/delete their own recipes
DROP POLICY IF EXISTS "Creators manage own recipes" ON public.recipes;
CREATE POLICY "Creators manage own recipes" ON public.recipes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.food_creators c WHERE c.id = recipes.creator_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.food_creators c WHERE c.id = recipes.creator_id AND c.user_id = auth.uid()));

-- Claim function
CREATE OR REPLACE FUNCTION public.claim_creator(_token text)
RETURNS public.food_creators
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rec public.food_creators;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO rec FROM public.food_creators WHERE claim_token = _token LIMIT 1;
  IF rec.id IS NULL THEN
    RAISE EXCEPTION 'Invalid claim token';
  END IF;
  IF rec.user_id IS NOT NULL AND rec.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Profile already claimed';
  END IF;

  UPDATE public.food_creators
    SET user_id = auth.uid(),
        status = CASE WHEN status = 'verified' THEN 'verified' ELSE 'claimed' END,
        claimed_at = COALESCE(claimed_at, now()),
        badge_new = false,
        updated_at = now()
    WHERE id = rec.id
    RETURNING * INTO rec;

  RETURN rec;
END $$;

GRANT EXECUTE ON FUNCTION public.claim_creator(text) TO authenticated;
