import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { parseISO, isSameDay, addDays, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Clock,
  SlidersHorizontal,
  ChefHat,
  X,
  Carrot,
  Plus,
  Sparkles,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tables } from "@/integrations/supabase/types";
import { CATEGORIES, DIFFICULTIES, TIME_BUCKETS, fmtDateKey } from "@/lib/dates";
import { getPantry, setPantry, normalizeIngredient } from "@/lib/pantry";
import { ALLERGENS } from "@/lib/allergens";
import { getHealthyOnly, setHealthyOnly } from "@/lib/healthy";
import { MEAL_TYPES } from "@/lib/mealType";
import { Leaf } from "lucide-react";

type MealPlan = {
  id: string;
  plan_date: string;
  max_time_minutes: number | null;
  categories: string[] | null;
  difficulty: string | null;
  final_recipe_id: string | null;
  creator_id: string | null;
  allergies: string[] | null;
  meal_type: string | null;
};

type Creator = Pick<Tables<"food_creators">, "id" | "name" | "avatar_url" | "specialty" | "handle">;

const Filters = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dateParam = searchParams.get("date");

  const upcomingDates = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 30 }, (_, i) => addDays(today, i));
  }, []);

  const [pickedDate, setPickedDate] = useState<string>(dateParam ?? fmtDateKey(new Date()));
  const [dateConfirmed, setDateConfirmed] = useState<boolean>(!!dateParam);
  const [pickerOpen, setPickerOpen] = useState<boolean>(!dateParam);

  const today = pickedDate;
  const dateLabel = format(parseISO(today), "EEEE, MMM d");

  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [pantry, setPantryState] = useState<string[]>([]);
  const [pantryInput, setPantryInput] = useState("");
  const [healthyOnly, setHealthyOnlyState] = useState(false);

  const handleConfirmDate = () => {
    if (pickedDate !== dateParam) {
      setSearchParams({ date: pickedDate }, { replace: true });
    }
    setDateConfirmed(true);
    setPickerOpen(false);
  };

  useEffect(() => {
    if (!user || !dateConfirmed) return;
    setPantryState(getPantry(user.id, today));
    setHealthyOnlyState(getHealthyOnly(user.id, today));
    supabase
      .from("meal_plans")
      .select("*")
      .eq("user_id", user.id)
      .eq("plan_date", today)
      .maybeSingle()
      .then(({ data }) => setPlan((data as MealPlan) ?? null));
  }, [user, today, dateConfirmed]);

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
      allergies: plan?.allergies ?? [],
      meal_type: plan?.meal_type ?? null,
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

  const toggleAllergy = (key: string) => {
    const cur = plan?.allergies ?? [];
    const next = cur.includes(key) ? cur.filter((a) => a !== key) : [...cur, key];
    upsert({ allergies: next });
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
    if ((plan?.allergies?.length ?? 0) > 0) n++;
    if (healthyOnly) n++;
    if (plan?.meal_type) n++;
    return n;
  }, [plan, pantry, healthyOnly]);

  const clearAll = async () => {
    if (!user) return;
    setPantryState(setPantry(user.id, today, []));
    setHealthyOnlyState(setHealthyOnly(user.id, today, false));
    await upsert({ max_time_minutes: null, difficulty: null, categories: [], creator_id: null, allergies: [], meal_type: null });
    toast.success("Filters cleared");
  };

  const toggleHealthy = () => {
    if (!user) return;
    setHealthyOnlyState(setHealthyOnly(user.id, today, !healthyOnly));
  };

  const setMealType = (type: string | null) => {
    upsert({ meal_type: plan?.meal_type === type ? null : type });
  };

  const selectedCreator = creators.find((c) => c.id === plan?.creator_id) ?? null;

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <DatePickerDialog
        open={pickerOpen}
        dates={upcomingDates}
        pickedDate={pickedDate}
        onPick={setPickedDate}
        onConfirm={handleConfirmDate}
        onCancel={dateConfirmed ? () => setPickerOpen(false) : () => navigate("/plan")}
      />

      <header className="shrink-0 max-w-md mx-auto w-full px-5 pt-6 pb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display font-extrabold">Stel je filters in</h1>
          {dateConfirmed && (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-xs font-semibold hover:bg-primary/15 transition-colors"
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>{dateLabel}</span>
            </button>
          )}
        </div>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="text-muted-foreground shrink-0">
            Wis ({activeCount})
          </Button>
        )}
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className="max-w-md mx-auto w-full px-5 pb-8">


      <div className={cn("relative", !dateConfirmed && "blur-[5px] pointer-events-none select-none opacity-50")}>
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

          {/* Meal type */}
          <div>
            <p className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Utensils className="h-4 w-4" /> Meal type
            </p>
            <div className="flex gap-2">
              {MEAL_TYPES.map((mt) => (
                <button
                  key={mt.key}
                  onClick={() => setMealType(mt.key)}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all",
                    plan?.meal_type === mt.key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground"
                  )}
                >
                  {mt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Healthy */}
          <div>
            <p className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Leaf className="h-4 w-4" /> Diet
            </p>
            <button
              onClick={toggleHealthy}
              className={cn(
                "w-full py-2.5 rounded-xl text-sm font-semibold border-2 transition-all flex items-center justify-center gap-2",
                healthyOnly
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground",
              )}
              aria-pressed={healthyOnly}
            >
              <Leaf className="h-4 w-4" />
              Healthy only
            </button>
            <p className="text-xs text-muted-foreground mt-2">
              Only show lighter, veggie-forward and healthy dishes.
            </p>
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

          {/* Allergies */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold">Allergies &amp; avoid</p>
              {(plan?.allergies?.length ?? 0) > 0 && (
                <button
                  onClick={() => upsert({ allergies: [] })}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Recipes containing these ingredients will be hidden.
            </p>
            <div className="flex flex-wrap gap-2">
              {ALLERGENS.map((a) => {
                const active = plan?.allergies?.includes(a.key);
                return (
                  <Badge
                    key={a.key}
                    variant={active ? "default" : "outline"}
                    onClick={() => toggleAllergy(a.key)}
                    className={cn(
                      "cursor-pointer text-sm py-1.5 px-3 rounded-full transition-all",
                      active && "bg-primary text-primary-foreground hover:bg-primary"
                    )}
                  >
                    {a.label}
                  </Badge>
                );
              })}
            </div>
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

        <Button variant="hero" size="lg" className="w-full mt-5" onClick={() => navigate(`/swipe/${today}`, { state: { dateConfirmed: true } })}>
          <Sparkles className="h-5 w-5 mr-2" /> Start swiping
        </Button>
      </div>

      {!dateConfirmed && (
        <div className="absolute inset-0 grid place-items-center z-10 pointer-events-none">
          <div className="text-center bg-background/60 backdrop-blur-sm px-6 py-5 rounded-2xl">
            <CalendarIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground font-semibold">Kies een datum om je filters in te stellen</p>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};


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
  const selectedRef = useRef<HTMLButtonElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
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
    scrollerRef.current?.scrollBy({ left: dir * 200, behavior: "smooth" });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }} modal={false}>
      <DialogPortal>
        <DialogOverlay className="bg-transparent" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-sm translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background/70 backdrop-blur-xl p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Which day are you filtering for?</DialogTitle>
          <DialogDescription>
            Filters apply only to this date's meal plan.
          </DialogDescription>
        </DialogHeader>

        <div className="relative min-w-0 overflow-hidden">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Previous dates"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background/90 border border-border shadow-sm grid place-items-center hover:bg-background"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Next dates"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background/90 border border-border shadow-sm grid place-items-center hover:bg-background"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div ref={scrollerRef} className="flex gap-2 overflow-x-auto py-2 px-10 scroll-smooth scrollbar-none">
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
            Confirm date
          </Button>
        </DialogFooter>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};

export default Filters;
