-- Create food_creators table
CREATE TABLE public.food_creators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  handle TEXT NOT NULL UNIQUE,
  bio TEXT,
  story TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  location TEXT,
  specialty TEXT,
  instagram_url TEXT,
  tiktok_url TEXT,
  youtube_url TEXT,
  website_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.food_creators ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Creators viewable by authenticated"
ON public.food_creators FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins manage creators"
ON public.food_creators FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_food_creators_updated_at
BEFORE UPDATE ON public.food_creators
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add creator_id to recipes
ALTER TABLE public.recipes
ADD COLUMN creator_id UUID REFERENCES public.food_creators(id) ON DELETE SET NULL;

CREATE INDEX idx_recipes_creator_id ON public.recipes(creator_id);