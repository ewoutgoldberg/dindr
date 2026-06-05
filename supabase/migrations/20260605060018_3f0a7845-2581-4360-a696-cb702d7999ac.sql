
-- 1. Recipes extensions
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subtitle text;

CREATE INDEX IF NOT EXISTS idx_recipes_archived ON public.recipes(archived);

-- 2. recipe_views
CREATE TABLE public.recipe_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_recipe_views_recipe ON public.recipe_views(recipe_id, created_at DESC);

GRANT SELECT, INSERT ON public.recipe_views TO authenticated;
GRANT SELECT, INSERT ON public.recipe_views TO anon;
GRANT ALL ON public.recipe_views TO service_role;

ALTER TABLE public.recipe_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert views"
ON public.recipe_views FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Creator or admin can read views"
ON public.recipe_views FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.recipes r
    JOIN public.food_creators c ON c.id = r.creator_id
    WHERE r.id = recipe_views.recipe_id AND c.user_id = auth.uid()
  )
);

-- 3. recipe_shares
CREATE TABLE public.recipe_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL,
  user_id uuid,
  channel text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_recipe_shares_recipe ON public.recipe_shares(recipe_id, created_at DESC);

GRANT SELECT, INSERT ON public.recipe_shares TO authenticated;
GRANT SELECT, INSERT ON public.recipe_shares TO anon;
GRANT ALL ON public.recipe_shares TO service_role;

ALTER TABLE public.recipe_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert shares"
ON public.recipe_shares FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Creator or admin can read shares"
ON public.recipe_shares FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.recipes r
    JOIN public.food_creators c ON c.id = r.creator_id
    WHERE r.id = recipe_shares.recipe_id AND c.user_id = auth.uid()
  )
);

-- 4. creator_followers
CREATE TABLE public.creator_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (creator_id, user_id)
);
CREATE INDEX idx_creator_followers_creator ON public.creator_followers(creator_id);
CREATE INDEX idx_creator_followers_user ON public.creator_followers(user_id);

GRANT SELECT, INSERT, DELETE ON public.creator_followers TO authenticated;
GRANT SELECT ON public.creator_followers TO anon;
GRANT ALL ON public.creator_followers TO service_role;

ALTER TABLE public.creator_followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Followers readable by everyone"
ON public.creator_followers FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Users can follow as themselves"
ON public.creator_followers FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow themselves"
ON public.creator_followers FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
