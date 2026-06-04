ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS meal_type text DEFAULT 'dinner';
ALTER TABLE public.meal_plans ADD COLUMN IF NOT EXISTS meal_type text DEFAULT NULL;