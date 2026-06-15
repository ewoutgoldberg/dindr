ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS themealdb_id TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}'::text[];

CREATE UNIQUE INDEX IF NOT EXISTS recipes_themealdb_id_key
  ON public.recipes (themealdb_id)
  WHERE themealdb_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS recipes_tags_gin ON public.recipes USING GIN (tags);
CREATE INDEX IF NOT EXISTS recipes_category_idx ON public.recipes (category);
CREATE INDEX IF NOT EXISTS recipes_cuisine_idx ON public.recipes (cuisine);