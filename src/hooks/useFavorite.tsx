import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const useFavorite = (recipeId: string | undefined) => {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!user || !recipeId) return;
      const { data } = await supabase
        .from("favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("recipe_id", recipeId)
        .maybeSingle();
      if (!cancelled) setIsFavorite(!!data);
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [user, recipeId]);

  const toggle = useCallback(async () => {
    if (!user || !recipeId || loading) return;
    setLoading(true);
    if (isFavorite) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("recipe_id", recipeId);
      setLoading(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      setIsFavorite(false);
      toast("Removed from favorites");
    } else {
      const { error } = await supabase
        .from("favorites")
        .insert({ user_id: user.id, recipe_id: recipeId, source: "manual" });
      setLoading(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      setIsFavorite(true);
      toast.success("Added to favorites ❤️");
    }
  }, [user, recipeId, isFavorite, loading]);

  return { isFavorite, toggle, loading };
};
