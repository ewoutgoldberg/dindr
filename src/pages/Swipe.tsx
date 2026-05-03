import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, ChefHat, X, Heart, Loader2, Sparkles, Bookmark } from "lucide-react";
import { useFavorite } from "@/hooks/useFavorite";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import { Link } from "react-router-dom";
import { getPantry, extractIngredientNames, countMatches } from "@/lib/pantry";
import { NotifyPartnerButton } from "@/components/NotifyPartnerButton";

type Recipe = Tables<"recipes"> & { food_creators?: Pick<Tables<"food_creators">, "id" | "name" | "avatar_url" | "handle"> | null };

const Swipe = () => {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [matchInfo, setMatchInfo] = useState<Recipe | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user || !date) return;
      setLoading(true);

      // load plan filters
      const { data: plan } = await supabase.from("meal_plans").select("*").eq("user_id", user.id).eq("plan_date", date).maybeSingle();

      // load already swiped to exclude
      const { data: swiped } = await supabase.from("swipes").select("recipe_id").eq("user_id", user.id).eq("plan_date", date);
      const excluded = new Set(swiped?.map((s) => s.recipe_id) ?? []);

      let q = supabase.from("recipes").select("*, food_creators(id, name, avatar_url, handle)");
      if (plan?.max_time_minutes) q = q.lte("cooking_time_minutes", plan.max_time_minutes);
      if (plan?.difficulty) q = q.eq("difficulty", plan.difficulty);
      if (plan?.categories && plan.categories.length > 0) q = q.in("category", plan.categories);
      if (plan?.creator_id) q = q.eq("creator_id", plan.creator_id);

      const { data, error } = await q.limit(50);
      if (error) toast.error(error.message);

      let filtered = ((data ?? []) as Recipe[]).filter((r) => !excluded.has(r.id));

      // Pantry-aware ranking: prioritize recipes that use ingredients the user already has
      const pantry = getPantry(user.id, date);
      if (pantry.length > 0) {
        const scored = filtered.map((r) => ({
          r,
          score: countMatches(pantry, extractIngredientNames(r.ingredients)),
        }));
        const anyMatch = scored.some((s) => s.score > 0);
        if (anyMatch) {
          // Keep only recipes with at least one pantry hit, sorted by best match
          filtered = scored
            .filter((s) => s.score > 0)
            .sort((a, b) => b.score - a.score)
            .map((s) => s.r);
        } else {
          // No matches at all — fall back to a normal shuffle so the user isn't stuck
          filtered.sort(() => Math.random() - 0.5);
        }
      } else {
        filtered.sort(() => Math.random() - 0.5);
      }

      setRecipes(filtered);
      setIndex(0);
      setLoading(false);
    };
    load();
  }, [user, date]);

  const handleSwipe = async (liked: boolean) => {
    const recipe = recipes[index];
    if (!recipe || !user || !date) return;
    setIndex((i) => i + 1);

    await supabase.from("swipes").upsert(
      { user_id: user.id, recipe_id: recipe.id, plan_date: date, liked },
      { onConflict: "user_id,recipe_id,plan_date" }
    );

    if (liked) {
      // check if partner also liked → match
      const { data: partnership } = await supabase
        .from("partnerships")
        .select("user_a, user_b")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .maybeSingle();
      if (partnership) {
        const partnerId = partnership.user_a === user.id ? partnership.user_b : partnership.user_a;
        const { data: partnerSwipe } = await supabase
          .from("swipes")
          .select("liked")
          .eq("user_id", partnerId)
          .eq("recipe_id", recipe.id)
          .eq("plan_date", date)
          .maybeSingle();
        if (partnerSwipe?.liked) {
          setMatchInfo(recipe);
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const remaining = recipes.length - index;
  const dateLabel = date ? format(parseISO(date), "EEEE, MMM d") : "";

  return (
    <div className="flex-1 flex flex-col bg-background">
      <header className="px-5 pt-4 pb-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/plan")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">Swiping for</p>
          <h1 className="font-display font-bold text-lg leading-tight">{dateLabel}</h1>
        </div>
        <Badge variant="secondary" className="rounded-full">{remaining} left</Badge>
      </header>

      <div className="flex-1 px-5 relative">
        <div className="relative w-full max-w-md mx-auto aspect-[3/4.4]">
          {remaining === 0 ? (
            <EmptyState onBack={() => navigate("/plan")} onMatches={() => navigate("/matches")} date={date!} />
          ) : (
            <AnimatePresence>
              {recipes.slice(index, index + 3).reverse().map((r, stackIdx, arr) => {
                const isTop = stackIdx === arr.length - 1;
                return (
                  <SwipeCard
                    key={r.id}
                    recipe={r}
                    isTop={isTop}
                    depth={arr.length - 1 - stackIdx}
                    onSwipe={isTop ? handleSwipe : undefined}
                    onTap={() => navigate(`/recipe/${r.id}`)}
                  />
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>


      <AnimatePresence>
        {matchInfo && (
          <MatchModal recipe={matchInfo} onClose={() => setMatchInfo(null)} onView={() => navigate(`/recipe/${matchInfo.id}`)} />
        )}
      </AnimatePresence>
    </div>
  );
};

const SwipeCard = ({
  recipe,
  isTop,
  depth,
  onSwipe,
  onTap,
}: {
  recipe: Recipe;
  isTop: boolean;
  depth: number;
  onSwipe?: (liked: boolean) => void;
  onTap: () => void;
}) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [0, 120], [0, 1]);
  const nopeOpacity = useTransform(x, [-120, 0], [1, 0]);
  const startX = useRef<number>(0);

  const handleEnd = (_: unknown, info: PanInfo) => {
    const threshold = 100;
    if (Math.abs(info.offset.x) > threshold) {
      onSwipe?.(info.offset.x > 0);
    }
  };

  return (
    <motion.div
      className="swipe-card"
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        scale: 1 - depth * 0.04,
        y: depth * 12,
        zIndex: 10 - depth,
      }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleEnd}
      onPointerDown={(e) => (startX.current = e.clientX)}
      onPointerUp={(e) => {
        if (Math.abs(e.clientX - startX.current) < 6) onTap();
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 - depth * 0.04 }}
      exit={{ x: x.get() > 0 ? 600 : -600, opacity: 0, transition: { duration: 0.3 } }}
    >
      <img src={recipe.image_url ?? ""} alt={recipe.title} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 gradient-card-overlay" />
      {isTop && (
        <>
          <FavoriteToggle recipeId={recipe.id} />
          <motion.div
            style={{ opacity: likeOpacity }}
            className="absolute top-8 left-8 px-4 py-2 border-4 border-success text-success font-extrabold text-2xl rounded-xl rotate-[-12deg] bg-background/30 backdrop-blur-sm"
          >
            YUM
          </motion.div>
          <motion.div
            style={{ opacity: nopeOpacity }}
            className="absolute top-8 right-8 px-4 py-2 border-4 border-destructive text-destructive font-extrabold text-2xl rounded-xl rotate-[12deg] bg-background/30 backdrop-blur-sm"
          >
            NOPE
          </motion.div>
        </>
      )}
      <div className="absolute inset-x-0 bottom-0 p-6 text-primary-foreground">
        {recipe.food_creators && (
          <Link
            to={`/creator/${recipe.food_creators.id}`}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-2 bg-background/30 backdrop-blur-md rounded-full pr-3 pl-1 py-1 mb-3 hover:bg-background/40 transition-colors"
          >
            <img
              src={recipe.food_creators.avatar_url ?? ""}
              alt={recipe.food_creators.name}
              className="h-7 w-7 rounded-full object-cover"
            />
            <span className="text-xs font-semibold">by {recipe.food_creators.name}</span>
          </Link>
        )}
        <div className="flex gap-2 mb-2">
          <Badge className="bg-background/20 backdrop-blur text-primary-foreground border-0">{recipe.category}</Badge>
          <Badge className="bg-background/20 backdrop-blur text-primary-foreground border-0 capitalize">{recipe.difficulty}</Badge>
        </div>
        <h2 className="text-3xl font-display font-extrabold leading-tight drop-shadow">{recipe.title}</h2>
        <p className="text-sm mt-1.5 opacity-90 line-clamp-2">{recipe.description}</p>
        <div className="flex items-center gap-4 mt-3 text-sm font-semibold">
          <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {recipe.cooking_time_minutes} min</span>
          <span className="flex items-center gap-1.5 capitalize"><ChefHat className="h-4 w-4" /> {recipe.category}</span>
        </div>
      </div>
    </motion.div>
  );
};

const FavoriteToggle = ({ recipeId }: { recipeId: string }) => {
  const { isFavorite, toggle } = useFavorite(recipeId);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggle();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn(
        "absolute top-4 right-4 h-11 w-11 rounded-full grid place-items-center backdrop-blur-md transition-all active:scale-90 z-10",
        isFavorite ? "bg-accent text-accent-foreground" : "bg-background/40 text-primary-foreground hover:bg-background/60"
      )}
      aria-label={isFavorite ? "Remove from favorites" : "Save to favorites"}
    >
      <Bookmark className={cn("h-5 w-5", isFavorite && "fill-current")} />
    </button>
  );
};

const EmptyState = ({ date, onBack, onMatches }: { date: string; onBack: () => void; onMatches: () => void }) => (
  <div className="absolute inset-0 grid place-items-center text-center px-6">
    <div>
      <div className="h-20 w-20 rounded-full gradient-warm grid place-items-center mx-auto mb-4 shadow-glow">
        <Sparkles className="h-10 w-10 text-primary-foreground" />
      </div>
      <h2 className="text-2xl font-display font-extrabold">You're done swiping!</h2>
      <p className="text-muted-foreground mt-2">
        Let your partner know your suggestions are ready, or jump to your matches.
      </p>
      <div className="flex flex-col gap-2 mt-6">
        <NotifyPartnerButton
          planDate={date}
          variant="hero"
          size="lg"
          label="Notify partner my picks are ready"
          className="w-full"
        />
        <Button variant="outline" onClick={onMatches}>See my likes</Button>
        <Button variant="ghost" onClick={onBack}>Back to plan</Button>
      </div>
    </div>
  </div>
);

const MatchModal = ({ recipe, onClose, onView }: { recipe: Recipe; onClose: () => void; onView: () => void }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 bg-secondary/95 backdrop-blur-md grid place-items-center px-6"
  >
    <motion.div
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", damping: 14 }}
      className="text-center text-secondary-foreground"
    >
      <p className="text-accent text-2xl font-display font-extrabold mb-2 animate-pop">It's a match! 🎉</p>
      <h3 className="text-4xl font-display font-extrabold">{recipe.title}</h3>
      <img src={recipe.image_url ?? ""} alt={recipe.title} className="w-64 h-64 object-cover rounded-3xl mx-auto my-6 shadow-glow" />
      <p className="opacity-80 mb-6">You and your partner both liked this recipe.</p>
      <div className="flex flex-col gap-3">
        <Button variant="hero" size="lg" onClick={onView}>See recipe</Button>
        <Button variant="ghost" onClick={onClose} className="text-secondary-foreground hover:bg-secondary-foreground/10">Keep swiping</Button>
      </div>
    </motion.div>
  </motion.div>
);

export default Swipe;
