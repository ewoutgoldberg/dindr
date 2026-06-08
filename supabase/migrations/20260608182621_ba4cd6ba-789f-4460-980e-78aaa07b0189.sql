
-- K6: allow partner to upsert meal_plans for shared final pick
DROP POLICY IF EXISTS "Users insert own plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Users update own plans" ON public.meal_plans;
CREATE POLICY "Users insert own or partner plans" ON public.meal_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id = public.get_partner(auth.uid()));
CREATE POLICY "Users update own or partner plans" ON public.meal_plans
  FOR UPDATE USING (auth.uid() = user_id OR user_id = public.get_partner(auth.uid()));

-- K7: allow partner to clear checked shopping items
DROP POLICY IF EXISTS "Users delete own shopping" ON public.shopping_list_items;
CREATE POLICY "Users delete own or partner shopping" ON public.shopping_list_items
  FOR DELETE USING (auth.uid() = user_id OR user_id = public.get_partner(auth.uid()));
