import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, isToday, isSameDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES, DIFFICULTIES, TIME_BUCKETS, fmtDateKey, fmtDayLong, fmtDayNum, fmtDayShort, getWeekDays } from "@/lib/dates";
import { Clock, ChevronRight, Sparkles, Users, ChevronLeft, SlidersHorizontal } from "lucide-react";
import { addDays, startOfWeek } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type MealPlan = {
  id: string;
  plan_date: string;
  max_time_minutes: number | null;
  categories: string[] | null;
  difficulty: string | null;
  final_recipe_id: string | null;
};

const Plan = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selected, setSelected] = useState<Date>(new Date());
  const [plans, setPlans] = useState<Record<string, MealPlan>>({});
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const load = async () => {
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
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, weekStart]);

  const currentPlan = plans[fmtDateKey(selected)];

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

  const planAllWeek = async () => {
    if (!user) return;
    const tasks = days.map((d) => {
      const k = fmtDateKey(d);
      if (plans[k]) return null;
      return supabase.from("meal_plans").upsert({ user_id: user.id, plan_date: k }, { onConflict: "user_id,plan_date" });
    });
    await Promise.all(tasks.filter(Boolean));
    await load();
    toast.success("Whole week planned!");
  };

  return (
    <div className="max-w-md mx-auto w-full px-5 pt-6 animate-fade-in">
      <header className="mb-6">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider">This week</p>
        <h1 className="text-3xl font-display font-extrabold mt-1">What's cooking?</h1>
        <p className="text-muted-foreground mt-1">Swipe through dishes or set filters to narrow down.</p>
      </header>

      <Button
        variant="hero"
        size="lg"
        className="w-full mb-6 bg-gradient-to-r from-primary to-accent hover:opacity-90"
        onClick={() => navigate(`/swipe/${fmtDateKey(selected)}`)}
      >
        <Sparkles className="h-5 w-5 mr-2" /> Surprise me — start swiping!
      </Button>

      <div className="flex items-center justify-between mb-3">
        <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <p className="text-sm font-semibold">{format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d")}</p>
        <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

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
                isSel ? "bg-secondary text-secondary-foreground shadow-card" : "bg-muted/60 hover:bg-muted text-foreground"
              )}
            >
              <span className="text-[10px] font-semibold uppercase opacity-70">{fmtDayShort(d)}</span>
              <span className="text-lg font-display font-bold mt-0.5">{fmtDayNum(d)}</span>
              {isToday(d) && <span className="absolute top-1 right-1.5 h-1.5 w-1.5 rounded-full bg-accent" />}
              {hasPlan && !isSel && <span className={cn("h-1 w-1 rounded-full mt-1", isFinal ? "bg-success" : "bg-primary")} />}
            </button>
          );
        })}
      </div>

      <Button variant="outline" size="sm" className="w-full mb-6" onClick={planAllWeek}>
        <Sparkles className="h-4 w-4 mr-2" /> Plan whole week
      </Button>

      <section className="bg-card rounded-3xl p-5 shadow-soft mb-4">
        <p className="text-sm text-muted-foreground">Selected day</p>
        <h2 className="font-display font-bold text-xl">{fmtDayLong(selected)}</h2>

        <div className="mt-5">
          <p className="text-sm font-semibold mb-2 flex items-center gap-2"><Clock className="h-4 w-4" /> Cooking time</p>
          <div className="flex gap-2">
            {TIME_BUCKETS.map((t) => (
              <button
                key={t.value}
                onClick={() => upsert({ max_time_minutes: t.value })}
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

        <div className="mt-5">
          <p className="text-sm font-semibold mb-2">Difficulty</p>
          <div className="flex gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                onClick={() => upsert({ difficulty: d.value })}
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

        <div className="mt-5">
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
      </section>

      <div className="pt-4 pb-6 text-center">
        <p className="text-xs text-muted-foreground mb-2">Want more control?</p>
        <Button variant="outline" className="w-full" onClick={() => navigate(`/swipe/${fmtDateKey(selected)}`)}>
          <SlidersHorizontal className="h-4 w-4 mr-2" /> Swipe with filters
        </Button>
      </div>
    </div>
  );
};

export default Plan;
