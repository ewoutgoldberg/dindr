import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, isToday, isSameDay, addDays, startOfWeek } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CATEGORIES, DIFFICULTIES, TIME_BUCKETS, fmtDateKey, fmtDayLong, fmtDayNum, fmtDayShort } from "@/lib/dates";
import {
  Clock,
  ChevronRight,
  Sparkles,
  ChevronLeft,
  SlidersHorizontal,
  Heart,
  ChefHat,
  X,
  Carrot,
  Plus,
  MoreVertical,
  ChevronDown,
  RefreshCw,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tables } from "@/integrations/supabase/types";
import { getPantry, setPantry, normalizeIngredient } from "@/lib/pantry";

type MealPlan = {
  id: string;
  plan_date: string;
  max_time_minutes: number | null;
  categories: string[] | null;
  difficulty: string | null;
  final_recipe_id: string | null;
  creator_id: string | null;
};

type Creator = Pick<Tables<"food_creators">, "id" | "name" | "avatar_url" | "specialty" | "handle">;
type RecipeLite = Pick<Tables<"recipes">, "id" | "title" | "image_url" | "cooking_time_minutes" | "category">;

const Plan = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selected, setSelected] = useState<Date>(new Date());
  const [plans, setPlans] = useState<Record<string, MealPlan>>({});
  const [recipesById, setRecipesById] = useState<Record<string, RecipeLite>>({});
  const [creators, setCreators] = useState<Creator[]>([]);
  const [pantry, setPantryState] = useState<string[]>([]);
  const [pantryInput, setPantryInput] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Pantry: refresh when day or user changes
  useEffect(() => {
    if (!user) {
      setPantryState([]);
      return;
    }
    setPantryState(getPantry(user.id, fmtDateKey(selected)));
  }, [user, selected]);

  const addPantryItem = (raw: string) => {
    if (!user) return;
    const value = normalizeIngredient(raw);
    if (!value) return;
    const next = setPantry(user.id, fmtDateKey(selected), [...pantry, value]);
    setPantryState(next);
    setPantryInput("");
  };

  const removePantryItem = (item: string) => {
    if (!user) return;
    const next = setPantry(user.id, fmtDateKey(selected), pantry.filter((p) => p !== item));
    setPantryState(next);
  };

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

  useEffect(() => {
    supabase
      .from("food_creators")
      .select("id, name, avatar_url, specialty, handle")
      .order("name")
      .then(({ data }) => setCreators((data as Creator[]) ?? []));
  }, []);

  const currentPlan = plans[fmtDateKey(selected)];
  const selectedCreator = creators.find((c) => c.id === currentPlan?.creator_id) ?? null;
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

  const upsert = async (patch: Partial<MealPlan>) => {
    if (!user) return;
    const dateKey = fmtDateKey(selected);
    const existing = plans[dateKey];
    const payload = {
      user_id: user.id,
      plan_date: dateKey,
      max_time_minutes: existing?.max_time_minutes ?? null,
      categories: existing?.categories ?? [],
      difficulty: existing?.difficulty ?? null,
      creator_id: existing?.creator_id ?? null,
      ...patch,
    };
    const { data, error } = await supabase
      .from("meal_plans")
      .upsert(payload, { onConflict: "user_id,plan_date" })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setPlans((p) => ({ ...p, [dateKey]: data as MealPlan }));
  };

  const toggleCategory = (cat: string) => {
    const cur = currentPlan?.categories ?? [];
    const next = cur.includes(cat) ? cur.filter((c) => c !== cat) : [...cur, cat];
    upsert({ categories: next });
  };

  const clearAllFilters = async () => {
    if (!user) return;
    setPantryState(setPantry(user.id, fmtDateKey(selected), []));
    await upsert({
      max_time_minutes: null,
      difficulty: null,
      categories: [],
      creator_id: null,
    });
    toast.success("Filters cleared");
  };

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

  return (
    <div className="max-w-md mx-auto w-full px-5 pt-6 pb-8 animate-fade-in">
      {/* Header */}
      <header className="mb-5">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider">Meal plan</p>
        <h1 className="text-3xl font-display font-extrabold mt-1">What's cooking?</h1>
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
          const hasPlan = !!plans[k];
          const isFinal = !!plans[k]?.final_recipe_id;
          return (
            <button
              key={k}
              onClick={() => setSelected(d)}
              className={cn(
                "flex flex-col items-center py-3 rounded-2xl transition-all relative",
                isSel
                  ? "bg-secondary text-secondary-foreground shadow-card"
                  : "bg-muted/60 hover:bg-muted text-foreground"
              )}
              aria-pressed={isSel}
            >
              <span className="text-[10px] font-semibold uppercase opacity-70">{fmtDayShort(d)}</span>
              <span className="text-lg font-display font-bold mt-0.5">{fmtDayNum(d)}</span>
              {isToday(d) && <span className="absolute top-1 right-1.5 h-1.5 w-1.5 rounded-full bg-accent" />}
              {hasPlan && !isSel && (
                <span className={cn("h-1 w-1 rounded-full mt-1", isFinal ? "bg-success" : "bg-primary")} />
              )}
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
            onSwap={startSwiping}
          />
        ) : (
          <EmptyDayCard
            hasFilters={activeFilterCount > 0}
            onSwipe={startSwiping}
            onOpenFilters={() => navigate(`/filters?date=${fmtDateKey(selected)}`)}
          />
        )}
      </section>

      {/* Refine panel */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="mb-4">
        <div className="flex items-center justify-between gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="flex-1 justify-between h-12">
              <span className="flex items-center gap-2 font-semibold">
                <SlidersHorizontal className="h-4 w-4" />
                Refine
                {activeFilterCount > 0 && (
                  <Badge className="ml-1 h-5 px-2 bg-primary text-primary-foreground hover:bg-primary">
                    {activeFilterCount}
                  </Badge>
                )}
              </span>
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", filtersOpen && "rotate-180")}
              />
            </Button>
          </CollapsibleTrigger>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-muted-foreground">
              Clear
            </Button>
          )}
        </div>

        <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="bg-card rounded-3xl p-5 shadow-soft mt-3 space-y-5">
            {/* Cooking time */}
            <div>
              <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Cooking time
              </p>
              <div className="flex gap-2">
                {TIME_BUCKETS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() =>
                      upsert({ max_time_minutes: currentPlan?.max_time_minutes === t.value ? null : t.value })
                    }
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all",
                      currentPlan?.max_time_minutes === t.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <p className="text-sm font-semibold mb-2">Difficulty</p>
              <div className="flex gap-2">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.value}
                    onClick={() =>
                      upsert({ difficulty: currentPlan?.difficulty === d.value ? null : d.value })
                    }
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all capitalize",
                      currentPlan?.difficulty === d.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground"
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div>
              <p className="text-sm font-semibold mb-2">Categories</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const active = currentPlan?.categories?.includes(cat);
                  return (
                    <Badge
                      key={cat}
                      variant={active ? "default" : "outline"}
                      onClick={() => toggleCategory(cat)}
                      className={cn(
                        "cursor-pointer text-sm py-1.5 px-3 rounded-full transition-all",
                        active && "bg-primary text-primary-foreground hover:bg-primary"
                      )}
                    >
                      {cat}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Pantry */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Carrot className="h-4 w-4" /> Already in your kitchen
                </p>
                {pantry.length > 0 && (
                  <button
                    onClick={() => {
                      if (!user) return;
                      setPantryState(setPantry(user.id, fmtDateKey(selected), []));
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <X className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Add ingredients you already have. We'll prioritize recipes that use them.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addPantryItem(pantryInput);
                }}
                className="flex gap-2"
              >
                <Input
                  value={pantryInput}
                  onChange={(e) => setPantryInput(e.target.value)}
                  placeholder="e.g. tomato, garlic, pasta"
                  maxLength={40}
                  className="h-10"
                />
                <Button
                  type="submit"
                  size="icon"
                  variant="outline"
                  aria-label="Add ingredient"
                  disabled={!pantryInput.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </form>
              {pantry.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {pantry.map((item) => (
                    <Badge
                      key={item}
                      variant="secondary"
                      className="cursor-pointer text-sm py-1.5 pl-3 pr-2 rounded-full flex items-center gap-1"
                      onClick={() => removePantryItem(item)}
                    >
                      {item}
                      <X className="h-3 w-3 opacity-70" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Food creator */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <ChefHat className="h-4 w-4" /> Food creator
                </p>
                {selectedCreator && (
                  <button
                    onClick={() => upsert({ creator_id: null })}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <X className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>
              {creators.length === 0 ? (
                <p className="text-xs text-muted-foreground">No creators available yet.</p>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
                  {creators.map((c) => {
                    const active = currentPlan?.creator_id === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => upsert({ creator_id: active ? null : c.id })}
                        className="shrink-0 w-20 flex flex-col items-center gap-1.5 snap-start group"
                        aria-pressed={active}
                      >
                        <div
                          className={cn(
                            "h-16 w-16 rounded-full overflow-hidden ring-2 transition-all",
                            active
                              ? "ring-primary ring-offset-2 ring-offset-card scale-105"
                              : "ring-transparent group-hover:ring-border"
                          )}
                        >
                          {c.avatar_url ? (
                            <img src={c.avatar_url} alt={c.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full grid place-items-center bg-muted text-muted-foreground">
                              <ChefHat className="h-6 w-6" />
                            </div>
                          )}
                        </div>
                        <span
                          className={cn(
                            "text-[11px] font-semibold leading-tight text-center line-clamp-2",
                            active ? "text-primary" : "text-muted-foreground"
                          )}
                        >
                          {c.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedCreator?.specialty && (
                <p className="text-xs text-muted-foreground mt-2 italic">"{selectedCreator.specialty}"</p>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Footer action */}
      <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => navigate("/favorites")}>
        <Heart className="h-4 w-4 mr-2 text-accent fill-accent" /> Browse my favorites
      </Button>
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
