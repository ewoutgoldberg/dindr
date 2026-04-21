import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, ChefHat, X, Check, Loader2, Heart } from "lucide-react";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

type Recipe = Tables<"recipes"> & { food_creators?: Pick<Tables<"food_creators">, "id" | "name" | "avatar_url" | "handle"> | null };

const SwipeFavorites = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [winner, setWinner] = useState<Recipe | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("favorites")
        .select("recipes(*, food_creators(id, name, avatar_url, handle))")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      const list = (data ?? [])
        .map((row) => row.recipes as Recipe | null)
        .filter((r): r is Recipe => r !== null);
      list.sort(() => Math.random() - 0.5);
      setRecipes(list);
      setIndex(0);
      setLoading(false);
    };
    load();
  }, [user]);

  const handleSwipe = (liked: boolean) => {
    const recipe = recipes[index];
    if (!recipe) return;
    if (liked) setWinner(recipe);
    setIndex((i) => i + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const remaining = recipes.length - index;

  return (
    <div className="flex-1 flex flex-col bg-background">
      <header className="px-5 pt-4 pb-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/favorites")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">From your favorites</p>
          <h1 className="font-display font-bold text-lg leading-tight">Pick tonight's dish</h1>
        </div>
        <Badge variant="secondary" className="rounded-full">{remaining} left</Badge>
      </header>

      <div className="flex-1 px-5 relative">
        <div className="relative w-full max-w-md mx-auto aspect-[3/4.4]">
          {recipes.length === 0 ? (
            <EmptyState onBack={() => navigate("/favorites")} />
          ) : remaining === 0 ? (
            <DoneState winner={winner} onRestart={() => { setIndex(0); setWinner(null); setRecipes((r) => [...r].sort(() => Math.random() - 0.5)); }} onView={() => winner && navigate(`/recipe/${winner.id}`)} />
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
            aria-label="Pick"
          >
            <Check className="h-9 w-9" strokeWidth={3} />
          </button>
        </div>
      )}
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
  const yesOpacity = useTransform(x, [0, 120], [0, 1]);
  const nopeOpacity = useTransform(x, [-120, 0], [1, 0]);
  const startX = useRef<number>(0);

  const handleEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100) onSwipe?.(info.offset.x > 0);
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
            style={{ opacity: yesOpacity }}
            className="absolute top-8 left-8 px-4 py-2 border-4 border-success text-success font-extrabold text-2xl rounded-xl rotate-[-12deg] bg-background/30 backdrop-blur-sm"
          >
            PICK
          </motion.div>
          <motion.div
            style={{ opacity: nopeOpacity }}
            className="absolute top-8 right-8 px-4 py-2 border-4 border-destructive text-destructive font-extrabold text-2xl rounded-xl rotate-[12deg] bg-background/30 backdrop-blur-sm"
          >
            SKIP
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
            <img src={recipe.food_creators.avatar_url ?? ""} alt={recipe.food_creators.name} className="h-7 w-7 rounded-full object-cover" />
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

const EmptyState = ({ onBack }: { onBack: () => void }) => (
  <div className="absolute inset-0 grid place-items-center text-center px-6">
    <div>
      <div className="h-20 w-20 rounded-full gradient-warm grid place-items-center mx-auto mb-4 shadow-glow">
        <Heart className="h-10 w-10 text-primary-foreground fill-current" />
      </div>
      <h2 className="text-2xl font-display font-extrabold">No favorites yet</h2>
      <p className="text-muted-foreground mt-2">Save some recipes first by tapping the heart icon.</p>
      <Button variant="hero" size="lg" className="mt-6" onClick={onBack}>Back to favorites</Button>
    </div>
  </div>
);

const DoneState = ({ winner, onRestart, onView }: { winner: Recipe | null; onRestart: () => void; onView: () => void }) => (
  <div className="absolute inset-0 grid place-items-center text-center px-6">
    <div>
      {winner ? (
        <>
          <img src={winner.image_url ?? ""} alt={winner.title} className="w-40 h-40 object-cover rounded-3xl mx-auto mb-4 shadow-glow" />
          <p className="text-accent font-bold uppercase tracking-wider text-sm">Top pick</p>
          <h2 className="text-2xl font-display font-extrabold mt-1">{winner.title}</h2>
          <p className="text-muted-foreground mt-2 text-sm">Last recipe you said yes to.</p>
          <div className="flex flex-col gap-2 mt-6">
            <Button variant="hero" size="lg" onClick={onView}>See recipe</Button>
            <Button variant="outline" onClick={onRestart}>Swipe again</Button>
          </div>
        </>
      ) : (
        <>
          <h2 className="text-2xl font-display font-extrabold">All done</h2>
          <p className="text-muted-foreground mt-2">You skipped them all — try again?</p>
          <Button variant="hero" size="lg" className="mt-6" onClick={onRestart}>Restart</Button>
        </>
      )}
    </div>
  </div>
);

export default SwipeFavorites;
