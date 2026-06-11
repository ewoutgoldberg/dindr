import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, ChefHat, X, Heart, Loader2, Sparkles, Bookmark, Calendar as CalendarIcon, ChevronLeft, ChevronRight, CreditCard, SlidersHorizontal } from "lucide-react";
import { useFavorite } from "@/hooks/useFavorite";
import { cn } from "@/lib/utils";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { addDays, isSameDay } from "date-fns";
import { fmtDateKey } from "@/lib/dates";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import { Link } from "react-router-dom";
import { getPantry, extractIngredientNames, countMatches } from "@/lib/pantry";
import { recipeHasAllergen } from "@/lib/allergens";
import { getHealthyOnly, isHealthyRecipe } from "@/lib/healthy";
import { NotifyPartnerButton } from "@/components/NotifyPartnerButton";

type Recipe = Tables<"recipes"> & { food_creators?: Pick<Tables<"food_creators">, "id" | "name" | "avatar_url" | "handle"> | null };

const Swipe = () => {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();
  const preConfirmed = (location.state as { dateConfirmed?: boolean } | null)?.dateConfirmed === true;
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [matchInfo, setMatchInfo] = useState<Recipe | null>(null);
  const alreadyConfirmed = preConfirmed || (date && sessionStorage.getItem("swipeDateConfirmed") === date);
  const [dateConfirmed, setDateConfirmed] = useState(alreadyConfirmed);
  const [pickerOpen, setPickerOpen] = useState(!alreadyConfirmed);
  const [pickedDate, setPickedDate] = useState<string>(date ?? fmtDateKey(new Date()));

  const upcomingDates = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 30 }, (_, i) => addDays(today, i));
  }, []);

  const handleConfirmDate = () => {
    sessionStorage.setItem("swipeDateConfirmed", pickedDate);
    sessionStorage.setItem("activeSwipeDate", pickedDate);
    setDateConfirmed(true);
    setPickerOpen(false);
    if (pickedDate !== date) {
      navigate(`/swipe/${pickedDate}`, { replace: true, state: { dateConfirmed: true } });
    }
  };

  const openRecipeFromSwipe = (recipeId: string) => {
    if (date) {
      sessionStorage.setItem("swipeDateConfirmed", date);
      sessionStorage.setItem(`swipeTopRecipe:${date}`, recipeId);
    }
    navigate(`/recipe/${recipeId}`);
  };

  useEffect(() => {
    const load = async () => {
      if (!user || !date) return;
      sessionStorage.setItem("activeSwipeDate", date);
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
      if ((plan as { meal_type?: string | null } | null)?.meal_type) {
        q = q.eq("meal_type", (plan as { meal_type?: string | null } | null)?.meal_type);
      }

      const { data, error } = await q.limit(50);
      if (error) toast.error(error.message);

      let filtered = ((data ?? []) as Recipe[]).filter((r) => !excluded.has(r.id));

      // Filter out recipes containing selected allergens
      const allergies = ((plan as { allergies?: string[] } | null)?.allergies) ?? [];
      if (allergies.length > 0) {
        filtered = filtered.filter(
          (r) => !recipeHasAllergen(extractIngredientNames(r.ingredients), allergies),
        );
      }

      // Healthy-only filter (local preference)
      if (getHealthyOnly(user.id, date)) {
        filtered = filtered.filter((r) => isHealthyRecipe(r));
      }


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

      // Restore the previously shown top card (e.g. after navigating to recipe detail and back)
      const storedTopId = sessionStorage.getItem(`swipeTopRecipe:${date}`);
      if (storedTopId) {
        const topIdx = filtered.findIndex((r) => r.id === storedTopId);
        if (topIdx > 0) {
          const [top] = filtered.splice(topIdx, 1);
          filtered.unshift(top);
        }
      }

      setRecipes(filtered);
      setIndex(0);
      setLoading(false);
    };
    load();
  }, [user, date]);

  const [lastSwipe, setLastSwipe] = useState<{ recipeId: string; index: number } | null>(null);

  const handleSwipe = async (liked: boolean) => {
    const recipe = recipes[index];
    if (!recipe || !user || !date) return;

    // Optimistically advance so the swiped card unmounts immediately and
    // can't be re-dragged while the network request is in flight.
    const swipedIndex = index;
    const nextIndex = swipedIndex + 1;
    setLastSwipe({ recipeId: recipe.id, index: swipedIndex });
    setIndex(nextIndex);
    const nextTop = recipes[nextIndex];
    if (nextTop) {
      sessionStorage.setItem(`swipeTopRecipe:${date}`, nextTop.id);
    } else {
      sessionStorage.removeItem(`swipeTopRecipe:${date}`);
    }

    const { error } = await supabase.from("swipes").upsert(
      { user_id: user.id, recipe_id: recipe.id, plan_date: date, liked },
      { onConflict: "user_id,recipe_id,plan_date" }
    );
    if (error) {
      // Rollback on failure.
      toast.error("Could not save your swipe. Try again.");
      setIndex(swipedIndex);
      setLastSwipe(null);
      if (recipe) sessionStorage.setItem(`swipeTopRecipe:${date}`, recipe.id);
      return;
    }


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

  const handleUndo = async () => {
    if (!lastSwipe || !user || !date) return;
    const { error } = await supabase
      .from("swipes")
      .delete()
      .eq("user_id", user.id)
      .eq("recipe_id", lastSwipe.recipeId)
      .eq("plan_date", date);
    if (error) {
      toast.error("Couldn't undo. Try again.");
      return;
    }
    setIndex(lastSwipe.index);
    sessionStorage.setItem(`swipeTopRecipe:${date}`, lastSwipe.recipeId);
    setLastSwipe(null);
    toast.success("Undone");
  };



  const remaining = recipes.length - index;
  const activeDateKey = dateConfirmed ? (date ?? pickedDate) : pickedDate;
  const dateLabel = format(parseISO(activeDateKey), "EEEE, MMM d");

  return (
    <div className="flex-1 flex flex-col bg-background min-h-0 overflow-hidden">

      <DatePickerDialog
        open={pickerOpen}
        dates={upcomingDates}
        pickedDate={pickedDate}
        onPick={setPickedDate}
        onConfirm={handleConfirmDate}
        onCancel={dateConfirmed ? () => setPickerOpen(false) : () => navigate("/plan")}
      />

      {loading ? (
        <div className="flex-1 grid place-items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="flex-1 flex px-5 pb-3 relative min-h-0 items-center justify-center">
          <div
            className="relative mx-auto min-h-0"
            style={{
              height: "100%",
              aspectRatio: "3 / 4",
              maxWidth: "min(28rem, 100%)",
              width: "auto",
            }}
          >
            {remaining === 0 ? (
              <EmptyState
                onMatches={() => navigate(`/matches?date=${date}`)}
                onAdjustFilters={() => navigate(`/filters?date=${date}`)}
                onRestart={async () => {
                  if (!user || !date) return;
                  const { error } = await supabase
                    .from("swipes")
                    .delete()
                    .eq("user_id", user.id)
                    .eq("plan_date", date);
                  if (error) {
                    toast.error("Couldn't restart. Try again.");
                    return;
                  }
                  sessionStorage.removeItem(`swipeTopRecipe:${date}`);
                  setLastSwipe(null);
                  setIndex(0);
                  setLoading(true);
                  // Trigger reload by navigating to same route with state
                  navigate(`/swipe/${date}`, { replace: true, state: { dateConfirmed: true, reload: Date.now() } });
                  window.location.reload();
                }}
                date={date!}
                noRecipes={recipes.length === 0}
                alreadyDone={recipes.length > 0}
              />
            ) : (
              <AnimatePresence mode="popLayout" initial={false}>
                {recipes.slice(index, index + 3).reverse().map((r, stackIdx, arr) => {
                  const isTop = stackIdx === arr.length - 1;
                  return (
                    <SwipeCard
                      key={r.id}
                      recipe={r}
                      isTop={isTop}
                      depth={arr.length - 1 - stackIdx}
                      onSwipe={isTop ? handleSwipe : undefined}
                      onTap={() => openRecipeFromSwipe(r.id)}
                    />
                  );
                })}
              </AnimatePresence>
            )}
            {remaining > 0 && (
              <button
                type="button"
                onClick={() => {
                  setPickedDate(activeDateKey);
                  setPickerOpen(true);
                }}
                className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-foreground/40 text-primary-foreground rounded-full pl-3 pr-4 py-2 hover:bg-foreground/50 transition-colors text-left"
              >
                <CalendarIcon className="h-4 w-4 shrink-0" />
                <div className="leading-tight">
                  <p className="text-[10px] font-semibold uppercase tracking-wider opacity-90">Swiping for</p>
                  <p className="text-sm font-display font-bold">{dateLabel}</p>
                </div>
              </button>
            )}
            {remaining > 0 && lastSwipe && (
              <button
                type="button"
                onClick={handleUndo}
                className="absolute top-[4.25rem] left-4 z-20 flex items-center gap-1.5 bg-foreground/40 text-primary-foreground rounded-full px-3 py-1.5 hover:bg-foreground/50 transition-colors text-xs font-semibold"
                aria-label="Undo last swipe"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/></svg>
                Undo last swipe
              </button>
            )}


          </div>
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

type SwipeCardProps = {
  recipe: Recipe;
  isTop: boolean;
  depth: number;
  onSwipe?: (liked: boolean) => void;
  onTap: () => void;
};

const SwipeCard = forwardRef<HTMLDivElement, SwipeCardProps>(({ recipe, isTop, depth, onSwipe, onTap }, ref) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [0, 120], [0, 1]);
  const nopeOpacity = useTransform(x, [-120, 0], [1, 0]);
  const startX = useRef<number>(0);
  const swipedRef = useRef(false);

  const handleEnd = (_: unknown, info: PanInfo) => {
    if (swipedRef.current) return;
    const threshold = 100;
    if (Math.abs(info.offset.x) > threshold) {
      swipedRef.current = true;
      onSwipe?.(info.offset.x > 0);
    }
  };


  return (
    <motion.div
      ref={ref}
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
      exit={{ x: x.get() > 0 ? (typeof window !== "undefined" ? window.innerWidth + 200 : 1200) : -(typeof window !== "undefined" ? window.innerWidth + 200 : 1200), opacity: 0, transition: { duration: 0.45, ease: "easeOut" } }}
    >
      <img src={recipe.image_url ?? ""} alt={recipe.title} loading={isTop ? "eager" : "lazy"} decoding="async" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 gradient-card-overlay" />
      {isTop && (
        <>
          <FavoriteToggle recipeId={recipe.id} />
          <Link
            to={`/recipe/${recipe.id}/card`}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute top-4 right-16 z-10 h-11 w-11 rounded-full grid place-items-center bg-foreground/40 backdrop-blur text-primary-foreground hover:bg-foreground/60 transition-colors"
            aria-label="Bekijk als kaart"
          >
            <CreditCard className="h-5 w-5" />
          </Link>
          <motion.div
            style={{ opacity: likeOpacity }}
            className="absolute top-8 left-8 px-4 py-2 border-4 border-success text-success font-extrabold text-2xl rounded-xl rotate-[-12deg] bg-background/70"
          >
            YUM
          </motion.div>
          <motion.div
            style={{ opacity: nopeOpacity }}
            className="absolute top-8 right-8 px-4 py-2 border-4 border-destructive text-destructive font-extrabold text-2xl rounded-xl rotate-[12deg] bg-background/70"
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
            className="inline-flex items-center gap-2 bg-foreground/40 rounded-full pr-3 pl-1 py-1 mb-3 hover:bg-foreground/50 transition-colors"
          >
            <img
              src={recipe.food_creators.avatar_url ?? ""}
              alt={recipe.food_creators.name}
              className="h-7 w-7 rounded-full object-cover"
            />
            <span className="text-xs font-semibold">by {recipe.food_creators.name}</span>
          </Link>
        )}
        <h2 className="text-3xl font-display font-extrabold leading-tight drop-shadow">{recipe.title}</h2>
        <p className="text-sm mt-1.5 opacity-90 line-clamp-2">{recipe.description}</p>
        <div className="flex items-center gap-4 mt-3 text-sm font-semibold">
          <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {recipe.cooking_time_minutes} min</span>
          <span className="flex items-center gap-1.5 capitalize"><ChefHat className="h-4 w-4" /> {recipe.servings} pers.</span>
        </div>
      </div>
    </motion.div>
  );
});
SwipeCard.displayName = "SwipeCard";

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
        "absolute top-4 right-4 h-11 w-11 rounded-full grid place-items-center transition-all active:scale-90 z-10",
        isFavorite ? "bg-accent text-accent-foreground" : "bg-foreground/40 text-primary-foreground hover:bg-foreground/60"
      )}
      aria-label={isFavorite ? "Remove from favorites" : "Save to favorites"}
    >
      <Bookmark className={cn("h-5 w-5", isFavorite && "fill-current")} />
    </button>
  );
};

const EmptyState = ({
  date,
  onMatches,
  onAdjustFilters,
  onRestart,
  noRecipes,
  alreadyDone,
}: {
  date: string;
  onMatches: () => void;
  onAdjustFilters: () => void;
  onRestart: () => void;
  noRecipes: boolean;
  alreadyDone?: boolean;
}) => (
  <div className="absolute inset-0 grid place-items-center text-center px-6">
    <div>
      {noRecipes ? (
        <>
          <div className="h-20 w-20 rounded-full bg-muted grid place-items-center mx-auto mb-4">
            <SlidersHorizontal className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-display font-extrabold">No recipes match your filters</h2>
          <p className="text-muted-foreground mt-2">
            Try loosening your filters or restart to swipe through all dishes again.
          </p>
          <div className="flex flex-col gap-2 mt-6">
            <Button variant="hero" size="lg" className="w-full" onClick={onAdjustFilters}>
              Adjust filters
            </Button>
            <Button variant="outline" size="lg" className="w-full" onClick={onRestart}>
              Restart swiping all dishes
            </Button>
          </div>
        </>
      ) : alreadyDone ? (
        <>
          <div className="h-20 w-20 rounded-full gradient-warm grid place-items-center mx-auto mb-4 shadow-glow">
            <Sparkles className="h-10 w-10 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-display font-extrabold">You've seen them all</h2>
          <p className="text-muted-foreground mt-2">
            You've gone through every recipe that matches this day's filters. Loosen them up to see more dishes, or jump to your likes.
          </p>
          <div className="flex flex-col gap-2 mt-6">
            <Button variant="hero" size="lg" className="w-full" onClick={onAdjustFilters}>
              Adjust filters
            </Button>
            <Button variant="outline" size="lg" className="w-full" onClick={onRestart}>
              Restart swiping all dishes
            </Button>
            <Button variant="ghost" onClick={onMatches}>See my likes</Button>
          </div>
        </>
      ) : (
        <>
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
          </div>
        </>
      )}
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

const DatePickerDialog = ({
  open,
  dates,
  pickedDate,
  onPick,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  dates: Date[];
  pickedDate: string;
  onPick: (key: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const didInitialScroll = useRef(false);

  useEffect(() => {
    if (!open) {
      didInitialScroll.current = false;
      return;
    }
    if (!didInitialScroll.current && selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: "nearest", inline: "center" });
      didInitialScroll.current = true;
    }
  }, [open, pickedDate]);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }} modal={false}>
      <DialogPortal>
        <DialogOverlay className="bg-transparent" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-sm translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background/70 backdrop-blur-xl p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Which day are you swiping for?</DialogTitle>
          <DialogDescription>
            Confirm the date so your picks land on the right meal plan.
          </DialogDescription>
        </DialogHeader>

        <div className="relative min-w-0 overflow-hidden">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Previous dates"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-9 w-9 grid place-items-center rounded-full bg-background/90 border border-border shadow-sm hover:bg-background"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Next dates"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-9 w-9 grid place-items-center rounded-full bg-background/90 border border-border shadow-sm hover:bg-background"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto py-2 px-10 scrollbar-none scroll-smooth"
          >
            {dates.map((d) => {
              const key = fmtDateKey(d);
              const isSelected = key === pickedDate;
              const today = isSameDay(d, new Date());
              return (
                <button
                  key={key}
                  ref={isSelected ? selectedRef : undefined}
                  onClick={() => onPick(key)}
                  className={cn(
                    "shrink-0 w-16 py-3 rounded-2xl border-2 flex flex-col items-center transition-all",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                      : "bg-card border-border hover:border-primary/50"
                  )}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                    {today ? "Today" : format(d, "EEE")}
                  </span>
                  <span className="font-display font-extrabold text-xl leading-tight mt-0.5">
                    {format(d, "d")}
                  </span>
                  <span className="text-[10px] opacity-70">{format(d, "MMM")}</span>
                </button>
              );
            })}
          </div>
        </div>

        <DialogFooter className="sm:justify-stretch">
          <Button variant="hero" size="lg" className="w-full" onClick={onConfirm}>
            Start swiping
          </Button>
        </DialogFooter>
      </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};

export default Swipe;
