import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, isToday, isSameDay, addDays, startOfWeek } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fmtDateKey, fmtDayLong, fmtDayNum, fmtDayShort } from "@/lib/dates";
import {
  Clock,
  ChevronRight,
  Sparkles,
  ChevronLeft,
  SlidersHorizontal,
  Heart,
  MoreVertical,
  RefreshCw,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tables } from "@/integrations/supabase/types";
import { getPantry } from "@/lib/pantry";
import { NotifyPartnerButton } from "@/components/NotifyPartnerButton";

type MealPlan = {
  id: string;
  plan_date: string;
  max_time_minutes: number | null;
  categories: string[] | null;
  difficulty: string | null;
  final_recipe_id: string | null;
  creator_id: string | null;
};


type RecipeLite = Pick<Tables<"recipes">, "id" | "title" | "image_url" | "cooking_time_minutes" | "category">;

const Plan = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selected, setSelected] = useState<Date>(new Date());
  const [plans, setPlans] = useState<Record<string, MealPlan>>({});
  const [recipesById, setRecipesById] = useState<Record<string, RecipeLite>>({});
  const [pantry, setPantryState] = useState<string[]>([]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Pantry: refresh when day or user changes (used only for active filter count)
  useEffect(() => {
    if (!user) {
      setPantryState([]);
      return;
    }
    setPantryState(getPantry(user.id, fmtDateKey(selected)));
  }, [user, selected]);

  const loadWeek = async () => {
    if (!user) return;
    const start = fmtDateKey(weekStart);
    const end = fmtDateKey(addDays(weekStart, 6));
    const { data } = await supabase
      .from("meal_plans")
      .select("*")
      .eq("user_id", user.id)
      .gte("plan_date", start)
      .lte("plan_date", end);
    const map: Record<string, MealPlan> = {};
    data?.forEach((p) => (map[p.plan_date] = p as MealPlan));
    setPlans(map);

    // Hydrate recipe thumbnails for any final_recipe_id in this week
    const ids = Array.from(new Set((data ?? []).map((p) => p.final_recipe_id).filter(Boolean) as string[]));
    if (ids.length > 0) {
      const { data: recs } = await supabase
        .from("recipes")
        .select("id, title, image_url, cooking_time_minutes, category")
        .in("id", ids);
      const recMap: Record<string, RecipeLite> = {};
      (recs ?? []).forEach((r) => (recMap[r.id] = r as RecipeLite));
      setRecipesById((prev) => ({ ...prev, ...recMap }));
    }
  };

  useEffect(() => {
    loadWeek();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, weekStart]);

  const currentPlan = plans[fmtDateKey(selected)];
  const finalRecipe = currentPlan?.final_recipe_id ? recipesById[currentPlan.final_recipe_id] : null;

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (currentPlan?.max_time_minutes) n++;
    if (currentPlan?.difficulty) n++;
    if ((currentPlan?.categories?.length ?? 0) > 0) n++;
    if (currentPlan?.creator_id) n++;
    if (pantry.length > 0) n++;
    return n;
  }, [currentPlan, pantry]);

  const planAllWeek = async () => {
    if (!user) return;
    const tasks = days.map((d) => {
      const k = fmtDateKey(d);
      if (plans[k]) return null;
      return supabase.from("meal_plans").upsert({ user_id: user.id, plan_date: k }, { onConflict: "user_id,plan_date" });
    });
    await Promise.all(tasks.filter(Boolean));
    await loadWeek();
    toast.success("Whole week planned!");
  };

  const startSwiping = () => navigate(`/swipe/${fmtDateKey(selected)}`);

  const handleSwap = async () => {
    if (!user) {
      startSwiping();
      return;
    }
    const dateKey = fmtDateKey(selected);
    const { count } = await supabase
      .from("swipes")
      .select("id", { count: "exact", head: true })
      .eq("plan_date", dateKey)
      .eq("liked", true);
    if ((count ?? 0) > 0) {
      navigate(`/matches?date=${dateKey}`);
    } else {
      startSwiping();
    }
  };

  return (
    <div className="max-w-md mx-auto w-full px-5 pt-6 pb-8 animate-fade-in">
      {/* Header */}
      <header className="mb-6">
        
        <h1 className="text-3xl font-display font-extrabold mt-1">What&apos;s cooking?</h1>
      </header>

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-3">
        <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Previous week">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <p className="text-sm font-semibold">{format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d")}</p>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Next week">
            <ChevronRight className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Week options">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
                <RefreshCw className="h-4 w-4 mr-2" /> Jump to this week
              </DropdownMenuItem>
              <DropdownMenuItem onClick={planAllWeek}>
                <Sparkles className="h-4 w-4 mr-2" /> Plan whole week
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Week strip */}
      <div className="grid grid-cols-7 gap-1.5 mb-5">
        {days.map((d) => {
          const k = fmtDateKey(d);
          const isSel = isSameDay(d, selected);
          const plan = plans[k];
          const recipe = plan?.final_recipe_id ? recipesById[plan.final_recipe_id] : null;
          return (
            <button
              key={k}
              onClick={() => setSelected(d)}
              className={cn(
                "flex flex-col items-center pt-2 pb-1.5 rounded-2xl transition-all relative",
                isSel
                  ? "bg-secondary text-secondary-foreground shadow-card"
                  : "bg-muted/60 hover:bg-muted text-foreground"
              )}
              aria-pressed={isSel}
            >
              <span className="text-[10px] font-semibold uppercase opacity-70">{fmtDayShort(d)}</span>
              <span className="text-base font-display font-bold leading-tight">{fmtDayNum(d)}</span>
              {isToday(d) && <span className="absolute top-1 right-1.5 h-1.5 w-1.5 rounded-full bg-accent" />}
              <div className="mt-1.5 h-8 w-8 rounded-lg overflow-hidden bg-background/60 grid place-items-center">
                {recipe?.image_url ? (
                  <img src={recipe.image_url} alt={recipe.title} className="h-full w-full object-cover" />
                ) : plan ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                ) : null}
              </div>
            </button>
          );
        })}
      </div>


      {/* Day card – the focus of the page */}
      <section className="mb-4">
        <div className="flex items-baseline justify-between mb-2 px-1">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              {isToday(selected) ? "Today" : "Selected day"}
            </p>
            <h2 className="font-display font-bold text-xl">{fmtDayLong(selected)}</h2>
          </div>
        </div>

        {finalRecipe ? (
          <PlannedRecipeCard
            recipe={finalRecipe}
            onView={() => navigate(`/recipe/${finalRecipe.id}`)}
            onSwap={handleSwap}
          />
        ) : (
          <EmptyDayCard
            hasFilters={activeFilterCount > 0}
            onSwipe={startSwiping}
            onOpenFilters={() => navigate(`/filters?date=${fmtDateKey(selected)}`)}
          />
        )}
      </section>



      {/* Notify partner – per selected day */}
      <div className="mb-4">
        <NotifyPartnerButton
          planDate={fmtDateKey(selected)}
          variant="outline"
          className="w-full"
          label={`Notify partner about ${isToday(selected) ? "today" : fmtDayLong(selected)}`}
        />
      </div>

      {/* Footer action */}
    </div>
  );
};

const PlannedRecipeCard = ({
  recipe,
  onView,
  onSwap,
}: {
  recipe: RecipeLite;
  onView: () => void;
  onSwap: () => void;
}) => (
  <div className="bg-card rounded-3xl overflow-hidden shadow-card">
    <button onClick={onView} className="block w-full text-left active:opacity-90 transition-opacity">
      <div className="relative aspect-[16/10] bg-muted">
        {recipe.image_url ? (
          <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-muted-foreground">
            <ImageIcon className="h-10 w-10" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2">
          <Badge className="bg-success text-success-foreground border-0">Planned</Badge>
          <Badge variant="secondary" className="bg-background/80 backdrop-blur">
            <Clock className="h-3 w-3 mr-1" /> {recipe.cooking_time_minutes} min
          </Badge>
        </div>
      </div>
      <div className="p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{recipe.category}</p>
        <h3 className="font-display font-bold text-lg leading-tight mt-0.5 line-clamp-2">{recipe.title}</h3>
      </div>
    </button>
    <div className="px-4 pb-4 flex gap-2">
      <Button variant="hero" className="flex-1" onClick={onView}>
        View recipe
      </Button>
      <Button variant="outline" onClick={onSwap}>
        <RefreshCw className="h-4 w-4 mr-2" /> Swap
      </Button>
    </div>
  </div>
);

const EmptyDayCard = ({
  hasFilters,
  onSwipe,
  onOpenFilters,
}: {
  hasFilters: boolean;
  onSwipe: () => void;
  onOpenFilters: () => void;
}) => (
  <div className="bg-card rounded-3xl p-6 shadow-soft text-center">
    <div className="h-14 w-14 rounded-full gradient-warm grid place-items-center mx-auto mb-3 shadow-glow">
      <Sparkles className="h-7 w-7 text-primary-foreground" />
    </div>
    <h3 className="font-display font-bold text-lg">Nothing planned yet</h3>
    <p className="text-sm text-muted-foreground mt-1 mb-5">
      {hasFilters
        ? "Your filters are set. Start swiping to pick a recipe."
        : "Start swiping to pick a dish — or refine first."}
    </p>
    <Button
      variant="hero"
      size="lg"
      className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
      onClick={onSwipe}
    >
      <Sparkles className="h-5 w-5 mr-2" /> Start swiping
    </Button>
    <Button variant="ghost" size="sm" className="w-full mt-2 text-muted-foreground" onClick={onOpenFilters}>
      <SlidersHorizontal className="h-4 w-4 mr-2" /> Refine first
    </Button>
  </div>
);

export default Plan;
