import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Clock, ChefHat, Users, Star, ShoppingCart, Loader2, Plus, Minus, Heart, CreditCard } from "lucide-react";
import { CreatorCard } from "@/components/CreatorCard";
import { useFavorite } from "@/hooks/useFavorite";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { notifyPartnerFinalPick } from "@/lib/notifyFinalPick";

type Creator = Tables<"food_creators">;
type Recipe = Tables<"recipes"> & { food_creators?: Creator | null };
type Review = Tables<"reviews"> & { profiles?: { display_name: string | null; avatar_url: string | null } | null };

const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});

const RecipeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  // Fall back to the active swipe date so "Make it my pick" works when navigated from Swipe.
  const date = searchParams.get("date") ?? (typeof window !== "undefined" ? sessionStorage.getItem("activeSwipeDate") : null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [servings, setServings] = useState(2);
  const [canReview, setCanReview] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const { isFavorite, toggle: toggleFavorite } = useFavorite(id);

  useEffect(() => {
    const load = async () => {
      if (!id || !user) return;
      setLoading(true);
      const [{ data: r }, { data: rev }, { data: liked }] = await Promise.all([
        supabase.from("recipes").select("*, food_creators(*)").eq("id", id).maybeSingle(),
        supabase.from("reviews").select("*").eq("recipe_id", id).order("created_at", { ascending: false }),
        supabase.from("swipes").select("id").eq("user_id", user.id).eq("recipe_id", id).eq("liked", true).limit(1),
      ]);
      if (r) {
        setRecipe(r as Recipe);
        setServings(r.servings);
        // Fire-and-forget view tracking, deduped per session.
        const viewKey = `viewed:${r.id}`;
        if (typeof window !== "undefined" && !sessionStorage.getItem(viewKey)) {
          sessionStorage.setItem(viewKey, "1");
          supabase.from("recipe_views").insert({ recipe_id: r.id, user_id: user.id }).then(() => {});
        }
      }
      setReviews((rev as Review[]) ?? []);
      setCanReview((liked?.length ?? 0) > 0);
      const mine = rev?.find((x) => x.user_id === user.id);
      if (mine) {
        setMyRating(mine.rating);
        setMyComment(mine.comment ?? "");
      }
      setLoading(false);
    };
    load();
  }, [id, user]);


  const normalizeIngredients = (raw: unknown): Array<{ name: string; quantity: string }> => {
    if (!Array.isArray(raw)) return [];
    return raw.map((ing) => {
      if (typeof ing === "string") {
        const m = ing.match(/^([\d.,/]+\s*[a-zA-Z]*\.?)\s+(.+)$/);
        if (m) return { quantity: m[1].trim(), name: m[2].trim() };
        return { name: ing, quantity: "" };
      }
      if (ing && typeof ing === "object") {
        const o = ing as Record<string, unknown>;
        return {
          name: String(o.name ?? o.ingredient ?? ""),
          quantity: String(o.quantity ?? o.amount ?? ""),
        };
      }
      return { name: String(ing ?? ""), quantity: "" };
    });
  };

  const addToShopping = async () => {
    if (!recipe || !user) return;
    const items = normalizeIngredients(recipe.ingredients).map((ing) => ({
      user_id: user.id,
      name: ing.name,
      quantity: ing.quantity,
      recipe_id: recipe.id,
    }));
    // Dedupe against existing unchecked items for this user
    const { data: existing } = await supabase
      .from("shopping_list_items")
      .select("name, checked")
      .eq("user_id", user.id);
    const have = new Set(
      (existing ?? []).filter((i) => !i.checked).map((i) => i.name.toLowerCase().trim()),
    );
    const fresh = items.filter((i) => i.name && !have.has(i.name.toLowerCase().trim()));
    if (fresh.length === 0) {
      toast.info("All ingredients are already on your list.");
      return;
    }
    const { error } = await supabase.from("shopping_list_items").insert(fresh);
    if (error) toast.error(error.message);
    else toast.success(`Added ${fresh.length} ingredient${fresh.length === 1 ? "" : "s"} to shopping list`);
  };


  const makeFinal = async () => {
    if (!recipe || !user || !date) return;
    await supabase.from("meal_plans").upsert(
      { user_id: user.id, plan_date: date, final_recipe_id: recipe.id },
      { onConflict: "user_id,plan_date" }
    );
    await notifyPartnerFinalPick(user.id, date, recipe.title);
    toast.success("Set as your final pick!");
  };

  const submitReview = async () => {
    if (!recipe || !user) return;
    const parsed = reviewSchema.safeParse({ rating: myRating, comment: myComment });
    if (!parsed.success) {
      toast.error("Please pick 1-5 stars and keep comment under 500 chars");
      return;
    }
    setSubmittingReview(true);
    const { error } = await supabase.from("reviews").upsert(
      { user_id: user.id, recipe_id: recipe.id, rating: parsed.data.rating, comment: parsed.data.comment ?? null },
      { onConflict: "user_id,recipe_id" }
    );
    setSubmittingReview(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Review saved");
      const { data: rev } = await supabase.from("reviews").select("*").eq("recipe_id", recipe.id).order("created_at", { ascending: false });
      setReviews((rev as Review[]) ?? []);
    }
  };

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!recipe) return <div className="min-h-screen grid place-items-center text-muted-foreground">Recipe not found</div>;

  const ingredients = normalizeIngredients(recipe.ingredients);
  const instructions = recipe.instructions as string[];
  const scale = servings / recipe.servings;
  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="relative max-w-md mx-auto h-[55vh] max-h-[520px] overflow-hidden bg-muted">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="absolute inset-0 gradient-primary grid place-items-center">
            <ChefHat className="h-20 w-20 text-primary-foreground/60" />
          </div>
        )}
        <div className="absolute inset-0 gradient-card-overlay" />
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="absolute top-4 left-4 bg-background/30 backdrop-blur text-primary-foreground hover:bg-background/40">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <button
          onClick={() => navigate(`/recipe/${recipe.id}/card`)}
          className="absolute top-4 right-16 h-11 w-11 rounded-full grid place-items-center backdrop-blur transition-all active:scale-90 bg-background/30 text-primary-foreground hover:bg-background/40"
          aria-label="Bekijk als kaart"
        >
          <CreditCard className="h-5 w-5" />
        </button>
        <button
          onClick={toggleFavorite}
          className={cn(
            "absolute top-4 right-4 h-11 w-11 rounded-full grid place-items-center backdrop-blur transition-all active:scale-90",
            isFavorite ? "bg-accent text-accent-foreground" : "bg-background/30 text-primary-foreground hover:bg-background/40"
          )}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart className={cn("h-5 w-5", isFavorite && "fill-current")} />
        </button>
        <div className="absolute inset-x-0 bottom-0 p-6 text-primary-foreground">
          <div className="flex gap-2 mb-2">
            <Badge className="bg-background/20 backdrop-blur text-primary-foreground border-0">{recipe.category}</Badge>
            <Badge className="bg-background/20 backdrop-blur text-primary-foreground border-0 capitalize">{recipe.difficulty}</Badge>
          </div>
          <h1 className="text-3xl font-display font-extrabold leading-tight drop-shadow">{recipe.title}</h1>
          <p className="mt-2 opacity-90">{recipe.description}</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 -mt-6 relative z-10">
        <div className="bg-card rounded-3xl shadow-card p-5 grid grid-cols-3 text-center">
          <div>
            <Clock className="h-5 w-5 mx-auto text-primary" />
            <p className="text-xs text-muted-foreground mt-1">Cook</p>
            <p className="font-display font-bold">{recipe.cooking_time_minutes} min</p>
          </div>
          <div className="border-x border-border">
            <ChefHat className="h-5 w-5 mx-auto text-primary" />
            <p className="text-xs text-muted-foreground mt-1">Level</p>
            <p className="font-display font-bold capitalize">{recipe.difficulty}</p>
          </div>
          <div>
            <Star className="h-5 w-5 mx-auto text-primary fill-primary" />
            <p className="text-xs text-muted-foreground mt-1">Rating</p>
            <p className="font-display font-bold">{avgRating > 0 ? avgRating.toFixed(1) : "—"}</p>
          </div>
        </div>

        {recipe.food_creators && (
          <section className="mt-6">
            <CreatorCard creator={recipe.food_creators} />
          </section>
        )}

        <section className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-xl">Ingredients</h2>
            <div className="flex items-center gap-2 bg-muted rounded-full p-1">
              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={() => setServings(Math.max(1, servings - 1))}><Minus className="h-3.5 w-3.5" /></Button>
              <span className="text-sm font-bold w-14 text-center"><Users className="h-3.5 w-3.5 inline mr-1" />{servings}</span>
              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={() => setServings(servings + 1)}><Plus className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
          <ul className="space-y-2">
            {ingredients.map((ing, i) => (
              <li key={i} className="flex items-center justify-between bg-card rounded-2xl px-4 py-3 shadow-soft">
                <span className="font-medium">{ing.name}</span>
                <span className="text-muted-foreground text-sm font-mono">{scaleQty(ing.quantity, scale)}</span>
              </li>
            ))}
          </ul>
          <Button variant="outline" className="w-full mt-3" onClick={addToShopping}>
            <ShoppingCart className="h-4 w-4 mr-2" /> Add to shopping list
          </Button>
        </section>

        <section className="mt-6">
          <h2 className="font-display font-bold text-xl mb-3">Steps</h2>
          <ol className="space-y-3">
            {instructions.map((step, i) => (
              <li key={i} className="flex gap-3 bg-card rounded-2xl p-4 shadow-soft">
                <span className="h-7 w-7 rounded-full gradient-primary text-primary-foreground grid place-items-center text-sm font-bold shrink-0">{i + 1}</span>
                <p className="text-sm leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-6">
          <h2 className="font-display font-bold text-xl mb-3">Reviews ({reviews.length})</h2>
          {canReview ? (
            <div className="bg-card rounded-2xl p-4 shadow-soft mb-4">
              <p className="text-sm font-semibold mb-2">Your review</p>
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setMyRating(n)}>
                    <Star className={cn("h-7 w-7 transition-colors", n <= myRating ? "fill-accent text-accent" : "text-muted-foreground")} />
                  </button>
                ))}
              </div>
              <Textarea value={myComment} onChange={(e) => setMyComment(e.target.value)} placeholder="How was it?" maxLength={500} className="rounded-xl" />
              <Button variant="hero" className="w-full mt-3" onClick={submitReview} disabled={submittingReview || myRating === 0}>
                {submittingReview ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save review"}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground bg-muted/60 rounded-2xl p-4 mb-4">Like this recipe to leave a review.</p>
          )}
          {reviews.map((r) => (
            <div key={r.id} className="bg-card rounded-2xl p-4 shadow-soft mb-2">
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className={cn("h-4 w-4", n <= r.rating ? "fill-accent text-accent" : "text-muted-foreground/30")} />
                ))}
              </div>
              {r.comment && <p className="text-sm">{r.comment}</p>}
            </div>
          ))}
        </section>

        {date && (
          <Button variant="hero" size="lg" className="w-full mt-6" onClick={makeFinal}>
            Make this my pick for this day
          </Button>
        )}
      </div>
    </div>
  );
};

function scaleQty(q: string | null | undefined, scale: number): string {
  if (!q) return "";
  const m = q.match(/^([\d.,/\s]+)\s*(.*)$/);
  if (!m) return q;
  const raw = m[1].trim();
  // Mixed number "1 1/2" or pure fraction "1/2"
  let n = NaN;
  const mixed = raw.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  const frac = raw.match(/^(\d+)\/(\d+)$/);
  if (mixed) n = parseInt(mixed[1], 10) + parseInt(mixed[2], 10) / parseInt(mixed[3], 10);
  else if (frac) n = parseInt(frac[1], 10) / parseInt(frac[2], 10);
  else n = parseFloat(raw.replace(",", "."));
  if (isNaN(n)) return q;
  const out = +(n * scale).toFixed(2);
  return `${out} ${m[2]}`.trim();
}


export default RecipeDetail;
