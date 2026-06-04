ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS step_images jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS nutrition jsonb,
  ADD COLUMN IF NOT EXISTS card_assets_generated_at timestamptz;