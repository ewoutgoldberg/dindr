-- Favorites table
CREATE TABLE public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'manual', -- 'manual' or 'match'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, recipe_id)
);

CREATE INDEX idx_favorites_user ON public.favorites(user_id);
CREATE INDEX idx_favorites_recipe ON public.favorites(recipe_id);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own + partner favorites"
ON public.favorites FOR SELECT TO authenticated
USING (auth.uid() = user_id OR user_id = public.get_partner(auth.uid()));

CREATE POLICY "Users insert own favorites"
ON public.favorites FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own favorites"
ON public.favorites FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Trigger function: when a swipe is inserted/updated as liked, check if partner also liked
-- the same recipe on the same plan_date. If so, auto-favorite the recipe for both users.
CREATE OR REPLACE FUNCTION public.auto_favorite_on_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  partner_id UUID;
  partner_liked BOOLEAN;
BEGIN
  IF NEW.liked IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  partner_id := public.get_partner(NEW.user_id);
  IF partner_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT liked INTO partner_liked
  FROM public.swipes
  WHERE user_id = partner_id
    AND recipe_id = NEW.recipe_id
    AND plan_date = NEW.plan_date
  LIMIT 1;

  IF partner_liked IS TRUE THEN
    INSERT INTO public.favorites (user_id, recipe_id, source)
    VALUES (NEW.user_id, NEW.recipe_id, 'match')
    ON CONFLICT (user_id, recipe_id) DO NOTHING;

    INSERT INTO public.favorites (user_id, recipe_id, source)
    VALUES (partner_id, NEW.recipe_id, 'match')
    ON CONFLICT (user_id, recipe_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_favorite_on_match
AFTER INSERT OR UPDATE ON public.swipes
FOR EACH ROW
EXECUTE FUNCTION public.auto_favorite_on_match();