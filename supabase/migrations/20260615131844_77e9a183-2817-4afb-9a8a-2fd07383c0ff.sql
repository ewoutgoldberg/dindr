DROP INDEX IF EXISTS public.recipes_themealdb_id_key;
ALTER TABLE public.recipes ADD CONSTRAINT recipes_themealdb_id_unique UNIQUE (themealdb_id);