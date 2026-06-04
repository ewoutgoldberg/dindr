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
import { toast } from "sonner";

type Recipe = Tables<"recipes">;

const RecipeCard = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [stepImages, setStepImages] = useState<string[]>([]);
  const [nutrition, setNutrition] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id || !user) return;
      setLoading(true);
      const { data } = await supabase.from("recipes").select("*").eq("id", id).maybeSingle();
      if (data) {
        setRecipe(data as Recipe);
        const existing = (data.step_images as string[] | null) ?? [];
        const hasImages = existing.length > 0 && existing.some((u) => u);
        setStepImages(existing);
        setNutrition((data.nutrition as Record<string, number> | null) ?? null);

        if (!data.card_assets_generated_at && !hasImages) {
          setGenerating(true);
          try {
            const { data: res, error } = await supabase.functions.invoke(
              "generate-recipe-card-assets",
              { body: { recipe_id: id } }
            );
            if (error) throw error;
            if (res) {
              setStepImages(res.step_images ?? []);
              setNutrition(res.nutrition ?? null);
            }
          } catch (e) {
            console.error(e);
            toast.error("Kon stapfoto's niet genereren");
          } finally {
            setGenerating(false);
          }
        }
      }
      setLoading(false);
    };
    load();
  }, [id, user]);

  if (loading || !recipe) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
