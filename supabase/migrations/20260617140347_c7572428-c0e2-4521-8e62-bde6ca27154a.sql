ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS recipe_id uuid REFERENCES public.recipes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_social_posts_recipe ON public.social_posts(recipe_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_posted_at ON public.social_posts(posted_at DESC NULLS LAST);
COMMENT ON COLUMN public.social_posts.recipe_id IS 'Optional link from a social post to a recipe in our catalog. Populated automatically by the social-sync pipeline when a caption/metadata match is found.';