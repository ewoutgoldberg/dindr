import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, ChefHat, X, Heart, Loader2, Sparkles } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

type Recipe = Tables<"recipes">;

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

      let q = supabase.from("recipes").select("*");
      if (plan?.max_time_minutes) q = q.lte("cooking_time_minutes", plan.max_time_minutes);
      if (plan?.difficulty) q = q.eq("difficulty", plan.difficulty);
      if (plan?.categories && plan.categories.length > 0) q = q.in("category", plan.categories);

      const { data, error } = await q.limit(50);
      if (error) toast.error(error.message);

      const filtered = (data ?? []).filter((r) => !excluded.has(r.id));
      // shuffle
      filtered.sort(() => Math.random() - 0.5);
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

      {remaining > 0 && (
        <div className="px-5 py-6 flex items-center justify-center gap-6 safe-bottom">
          <button
            onClick={() => handleSwipe(false)}
            className="h-16 w-16 rounded-full bg-card shadow-card grid place-items-center text-muted-foreground hover:text-destructive transition-colors active:scale-90"
            aria-label="Skip"
          >
            <X className="h-7 w-7" strokeWidth={3} />
          </button>
          <button
            onClick={() => handleSwipe(true)}
            className="h-20 w-20 rounded-full gradient-primary shadow-glow grid place-items-center text-primary-foreground active:scale-90 transition-transform"
            aria-label="Like"
          >
            <Heart className="h-9 w-9 fill-current" />
          </button>
        </div>
      )}

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
        <div className="flex gap-2 mb-2">
          <Badge className="bg-background/20 backdrop-blur text-primary-foreground border-0">{recipe.category}</Badge>
          <Badge className="bg-background/20 backdrop-blur text-primary-foreground border-0 capitalize">{recipe.difficulty}</Badge>
        </div>
        <h2 className="text-3xl font-display font-extrabold leading-tight drop-shadow">{recipe.title}</h2>
        <p className="text-sm mt-1.5 opacity-90 line-clamp-2">{recipe.description}</p>
        <div className="flex items-center gap-4 mt-3 text-sm font-semibold">
          <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {recipe.cooking_time_minutes} min</span>
          <span className="flex items-center gap-1.5"><ChefHat className="h-4 w-4" /> {recipe.creator}</span>
        </div>
      </div>
    </motion.div>
  );
};

const EmptyState = ({ date, onBack, onMatches }: { date: string; onBack: () => void; onMatches: () => void }) => (
  <div className="absolute inset-0 grid place-items-center text-center px-6">
    <div>
      <div className="h-20 w-20 rounded-full gradient-warm grid place-items-center mx-auto mb-4 shadow-glow">
        <Sparkles className="h-10 w-10 text-primary-foreground" />
      </div>
      <h2 className="text-2xl font-display font-extrabold">No recipes match</h2>
      <p className="text-muted-foreground mt-2">
        Your filters are too strict for our current recipe library — try fewer categories or a higher difficulty/time.
      </p>
      <div className="flex flex-col gap-2 mt-6">
        <Button variant="hero" size="lg" onClick={onBack}>Adjust filters</Button>
        <Button variant="outline" onClick={onMatches}>See my likes</Button>
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
