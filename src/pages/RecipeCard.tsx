import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { OrientationGate } from "@/components/recipe-card/OrientationGate";
import { CardFront } from "@/components/recipe-card/CardFront";
import { CardBack } from "@/components/recipe-card/CardBack";

type Recipe = Tables<"recipes">;

const RecipeCard = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const [stepImages, setStepImages] = useState<string[]>([]);
  const [nutrition, setNutrition] = useState<Record<string, number> | null>(null);
  const [assetsReady, setAssetsReady] = useState(false);

  // Load recipe and kick off (non-blocking) asset generation
  useEffect(() => {
    if (!id || !user) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const { data } = await supabase.from("recipes").select("*").eq("id", id).maybeSingle();
      if (cancelled || !data) {
        setLoading(false);
        return;
      }
      const rec = data as Recipe;
      setRecipe(rec);
      const existing = (rec.step_images as string[] | null) ?? [];
      setStepImages(existing);
      setNutrition((rec.nutrition as Record<string, number> | null) ?? null);
      setAssetsReady(!!rec.card_assets_generated_at);
      setLoading(false);

      // Fire-and-forget generation if needed; realtime updates feed the UI.
      if (!rec.card_assets_generated_at) {
        supabase.functions
          .invoke("generate-recipe-card-assets", { body: { recipe_id: id } })
          .catch((e) => console.error("generation invoke failed", e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, user]);

  // Realtime: subscribe to updates of this recipe and patch step_images / nutrition live
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`recipe-card-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "recipes", filter: `id=eq.${id}` },
        (payload) => {
          const next = payload.new as Recipe;
          const imgs = (next.step_images as string[] | null) ?? [];
          setStepImages(imgs);
          setNutrition((next.nutrition as Record<string, number> | null) ?? null);
          if (next.card_assets_generated_at) setAssetsReady(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  if (loading || !recipe) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const steps = (recipe.instructions as string[]) ?? [];
  const hasAllImages = steps.length > 0 && stepImages.length >= steps.length && stepImages.every((u) => !!u);
  const generating = !assetsReady && !hasAllImages;

  return (
    <OrientationGate>
      <div className="fixed inset-0 bg-neutral-900 grid place-items-center p-4 overflow-hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="absolute top-3 left-3 z-20 bg-background/20 backdrop-blur text-white hover:bg-background/40"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div
          className="relative w-full h-full max-w-[900px] max-h-[560px] cursor-pointer"
          style={{ perspective: "1800px" }}
          onClick={() => setFlipped((f) => !f)}
        >
          <motion.div
            className="relative w-full h-full"
            style={{ transformStyle: "preserve-3d" }}
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
          >
            <CardFront recipe={recipe} />
            <CardBack
              recipe={recipe}
              stepImages={stepImages}
              nutrition={nutrition}
              generating={generating}
            />
          </motion.div>
        </div>

        <p className="absolute bottom-3 inset-x-0 text-center text-xs text-white/50">
          Tik op de kaart om om te draaien
        </p>
      </div>
    </OrientationGate>
  );
};

export default RecipeCard;
