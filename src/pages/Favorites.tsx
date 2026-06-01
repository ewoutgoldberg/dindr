import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, CalendarPlus, Check, Heart, Loader2, Sparkles, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fmtDateKey } from "@/lib/dates";

type FavoriteRow = Tables<"favorites"> & {
  recipes: (Tables<"recipes"> & { food_creators?: Pick<Tables<"food_creators">, "name" | "avatar_url"> | null }) | null;
};

const Favorites = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "manual" | "match">("all");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("favorites")
      .select("*, recipes(*, food_creators(name, avatar_url))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setFavorites((data as FavoriteRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const remove = async (id: string) => {
    const { error } = await supabase.from("favorites").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setFavorites((f) => f.filter((x) => x.id !== id));
    toast("Removed");
  };

  const filtered = favorites.filter((f) => filter === "all" || f.source === filter);
  const hasFavorites = favorites.length > 0;

  return (
    <div className="max-w-md mx-auto w-full px-5 pt-6 animate-fade-in">
      <header className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-display font-extrabold">Favorites</h1>

        </div>
      </header>

      {hasFavorites && (
        <Button
          variant="hero"
          size="lg"
          className="w-full mb-5 bg-gradient-to-r from-primary to-accent"
          onClick={() => navigate("/swipe-favorites")}
        >
          <Sparkles className="h-5 w-5 mr-2" /> Swipe through favorites
        </Button>
      )}

      {hasFavorites && (
        <div className="flex gap-2 mb-4">
          {[
            { v: "all", label: `All (${favorites.length})` },
            { v: "manual", label: `Saved (${favorites.filter((f) => f.source === "manual").length})` },
            { v: "match", label: `Matches (${favorites.filter((f) => f.source === "match").length})` },
          ].map((t) => (
            <button
              key={t.v}
              onClick={() => setFilter(t.v as typeof filter)}
              className={cn(
                "flex-1 py-2 rounded-full text-xs font-bold border-2 transition-all",
                filter === t.v ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !hasFavorites ? (
        <div className="text-center py-16">
          <div className="h-20 w-20 rounded-full gradient-warm grid place-items-center mx-auto mb-4 shadow-glow">
            <Heart className="h-10 w-10 text-primary-foreground fill-current" />
          </div>
          <h2 className="text-2xl font-display font-extrabold">No favorites yet</h2>
          <p className="text-muted-foreground mt-2 px-6">
            Tap the heart on any recipe to save it here. Matches with your partner are added automatically.
          </p>
          <Button variant="hero" size="lg" className="mt-6" onClick={() => navigate("/plan")}>
            Start swiping
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No favorites in this filter.</p>
      ) : (
        <ul className="space-y-3 pb-6">
          {filtered.map((f) =>
            f.recipes ? (
              <li key={f.id} className="bg-card rounded-2xl shadow-soft overflow-hidden flex">
                <Link to={`/recipe/${f.recipes.id}`} className="flex flex-1 min-w-0">
                  <img
                    src={f.recipes.image_url ?? ""}
                    alt={f.recipes.title}
                    className="w-24 h-24 object-cover shrink-0"
                  />
                  <div className="p-3 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      {f.source === "match" && (
                        <Badge className="bg-accent/15 text-accent border-0 text-[10px] py-0 px-1.5 h-4">MATCH</Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">{f.recipes.category}</Badge>
                    </div>
                    <h3 className="font-display font-bold leading-tight truncate">{f.recipes.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{f.recipes.cooking_time_minutes} min</span>
                      {f.recipes.food_creators && (
                        <span className="truncate">by {f.recipes.food_creators.name}</span>
                      )}
                    </div>
                  </div>
                </Link>
                <div className="flex flex-col items-center justify-center px-2 gap-1 border-l border-border">
                  <PlanFavoriteAction recipeId={f.recipes.id} userId={user?.id} />
                  <button
                    onClick={() => remove(f.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Remove favorite"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ) : null
          )}
        </ul>
      )}
    </div>
  );
};

const PlanFavoriteAction = ({ recipeId, userId }: { recipeId: string; userId?: string }) => {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [busy, setBusy] = useState<"suggest" | "final" | null>(null);

  const suggest = async () => {
    if (!userId || !date) return;
    setBusy("suggest");
    const planDate = fmtDateKey(date);
    const { error } = await supabase
      .from("swipes")
      .upsert(
        { user_id: userId, recipe_id: recipeId, plan_date: planDate, liked: true },
        { onConflict: "user_id,recipe_id,plan_date" },
      );
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Added as suggestion for ${format(date, "EEE d MMM")}`);
    setOpen(false);
  };

  const makeFinal = async () => {
    if (!userId || !date) return;
    setBusy("final");
    const planDate = fmtDateKey(date);
    // also record a like so it shows up under matches/suggestions
    await supabase
      .from("swipes")
      .upsert(
        { user_id: userId, recipe_id: recipeId, plan_date: planDate, liked: true },
        { onConflict: "user_id,recipe_id,plan_date" },
      );
    const { error } = await supabase
      .from("meal_plans")
      .upsert(
        { user_id: userId, plan_date: planDate, final_recipe_id: recipeId },
        { onConflict: "user_id,plan_date" },
      );
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Final pick for ${format(date, "EEE d MMM")}`);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
          aria-label="Plan this recipe"
        >
          <CalendarPlus className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[260px] p-3">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setOffset((o) => Math.max(0, o - 5))}
            disabled={offset === 0}
            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label="Earlier days"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="text-xs font-semibold text-muted-foreground">
            {offset === 0 ? "Next 5 days" : `+${offset} days`}
          </p>
          <button
            onClick={() => setOffset((o) => o + 5)}
            className="p-1 text-muted-foreground hover:text-foreground"
            aria-label="Later days"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-5 gap-1 mb-3">
          {days.map((d) => {
            const isSel = date && fmtDateKey(d) === fmtDateKey(date);
            return (
              <button
                key={d.toISOString()}
                onClick={() => setDate(d)}
                className={cn(
                  "flex flex-col items-center py-2 rounded-xl transition-colors",
                  isSel
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 hover:bg-muted text-foreground"
                )}
              >
                <span className="text-[9px] font-semibold uppercase opacity-70">{format(d, "EEE")}</span>
                <span className="text-sm font-display font-bold">{format(d, "d")}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={suggest}
            disabled={!date || busy !== null}
          >
            {busy === "suggest" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Suggest for this day
          </Button>
          <Button
            size="sm"
            variant="hero"
            onClick={makeFinal}
            disabled={!date || busy !== null}
          >
            {busy === "final" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
            Make final pick
          </Button>
        </div>

      </PopoverContent>
    </Popover>
  );
};

export default Favorites;
