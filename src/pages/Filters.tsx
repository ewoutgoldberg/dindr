import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { parseISO, isToday as isTodayFn } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Clock,
  SlidersHorizontal,
  ChefHat,
  X,
  Carrot,
  Plus,
  Sparkles,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tables } from "@/integrations/supabase/types";
import { CATEGORIES, DIFFICULTIES, TIME_BUCKETS, fmtDateKey, fmtDayLong } from "@/lib/dates";
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

const Filters = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get("date");
  const targetDate = useMemo(() => {
    if (dateParam) {
      try {
        return parseISO(dateParam);
      } catch {
        return new Date();
      }
    }
    return new Date();
  }, [dateParam]);
  const today = useMemo(() => fmtDateKey(targetDate), [targetDate]);
  const dayIsToday = isTodayFn(targetDate);
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [pantry, setPantryState] = useState<string[]>([]);
  const [pantryInput, setPantryInput] = useState("");

  useEffect(() => {
    if (!user) return;
    setPantryState(getPantry(user.id, today));
    supabase
      .from("meal_plans")
      .select("*")
      .eq("user_id", user.id)
      .eq("plan_date", today)
      .maybeSingle()
      .then(({ data }) => setPlan((data as MealPlan) ?? null));
  }, [user, today]);

  useEffect(() => {
    supabase
      .from("food_creators")
      .select("id, name, avatar_url, specialty, handle")
      .order("name")
      .then(({ data }) => setCreators((data as Creator[]) ?? []));
  }, []);

  const upsert = async (patch: Partial<MealPlan>) => {
    if (!user) return;
    const payload = {
      user_id: user.id,
      plan_date: today,
      max_time_minutes: plan?.max_time_minutes ?? null,
      categories: plan?.categories ?? [],
      difficulty: plan?.difficulty ?? null,
      creator_id: plan?.creator_id ?? null,
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
    setPlan(data as MealPlan);
  };

  const toggleCategory = (cat: string) => {
    const cur = plan?.categories ?? [];
    const next = cur.includes(cat) ? cur.filter((c) => c !== cat) : [...cur, cat];
    upsert({ categories: next });
  };

  const addPantryItem = (raw: string) => {
    if (!user) return;
    const value = normalizeIngredient(raw);
    if (!value) return;
    setPantryState(setPantry(user.id, today, [...pantry, value]));
    setPantryInput("");
  };

  const removePantryItem = (item: string) => {
    if (!user) return;
    setPantryState(setPantry(user.id, today, pantry.filter((p) => p !== item)));
  };

  const activeCount = useMemo(() => {
    let n = 0;
    if (plan?.max_time_minutes) n++;
    if (plan?.difficulty) n++;
    if ((plan?.categories?.length ?? 0) > 0) n++;
    if (plan?.creator_id) n++;
    if (pantry.length > 0) n++;
    return n;
  }, [plan, pantry]);

  const clearAll = async () => {
    if (!user) return;
    setPantryState(setPantry(user.id, today, []));
    await upsert({ max_time_minutes: null, difficulty: null, categories: [], creator_id: null });
    toast.success("Filters cleared");
  };

  const selectedCreator = creators.find((c) => c.id === plan?.creator_id) ?? null;

  return (
    <div className="max-w-md mx-auto w-full px-5 pt-6 pb-8 animate-fade-in">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </p>
          <h1 className="text-3xl font-display font-extrabold mt-1">Tune your inspiration</h1>
          <p className="text-sm text-muted-foreground mt-1">Applied to today's swipes.</p>
        </div>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="text-muted-foreground shrink-0">
            Clear ({activeCount})
          </Button>
        )}
      </header>

      <div className="bg-card rounded-3xl p-5 shadow-soft space-y-5">
        {/* Cooking time */}
        <div>
          <p className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4" /> Cooking time
          </p>
          <div className="flex gap-2">
            {TIME_BUCKETS.map((t) => (
              <button
                key={t.value}
                onClick={() => upsert({ max_time_minutes: plan?.max_time_minutes === t.value ? null : t.value })}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all",
                  plan?.max_time_minutes === t.value
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
                onClick={() => upsert({ difficulty: plan?.difficulty === d.value ? null : d.value })}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all capitalize",
                  plan?.difficulty === d.value
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
              const active = plan?.categories?.includes(cat);
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
                onClick={() => user && setPantryState(setPantry(user.id, today, []))}
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
            <Button type="submit" size="icon" variant="outline" aria-label="Add ingredient" disabled={!pantryInput.trim()}>
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
                const active = plan?.creator_id === c.id;
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

      <Button variant="hero" size="lg" className="w-full mt-5" onClick={() => navigate(`/swipe/${today}`)}>
        <Sparkles className="h-5 w-5 mr-2" /> Start swiping
      </Button>
    </div>
  );
};

export default Filters;
