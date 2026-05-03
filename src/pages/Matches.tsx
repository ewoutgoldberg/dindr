import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Loader2, Sparkles, Users } from "lucide-react";
import { fmtDayLong } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Recipe = Tables<"recipes">;
type Group = { date: string; mine: { recipe: Recipe; final: boolean }[]; partner: Recipe[]; mutual: Recipe[] };

const Matches = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPartner, setHasPartner] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      const { data: partnership } = await supabase
        .from("partnerships")
        .select("user_a, user_b")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .maybeSingle();
      const partnerId = partnership ? (partnership.user_a === user.id ? partnership.user_b : partnership.user_a) : null;
      setHasPartner(!!partnerId);

      const userIds = partnerId ? [user.id, partnerId] : [user.id];
      const { data: swipes } = await supabase
        .from("swipes")
        .select("user_id, plan_date, liked, recipe_id, recipes(*)")
        .in("user_id", userIds)
        .eq("liked", true)
        .order("plan_date", { ascending: true });

      const { data: plans } = await supabase.from("meal_plans").select("plan_date, final_recipe_id").eq("user_id", user.id);
      const finalMap = new Map(plans?.map((p) => [p.plan_date, p.final_recipe_id]));

      const map = new Map<string, Group>();
      swipes?.forEach((s) => {
        const recipe = s.recipes as Recipe;
        if (!recipe) return;
        if (!map.has(s.plan_date)) map.set(s.plan_date, { date: s.plan_date, mine: [], partner: [], mutual: [] });
        const g = map.get(s.plan_date)!;
        if (s.user_id === user.id) {
          g.mine.push({ recipe, final: finalMap.get(s.plan_date) === recipe.id });
        } else {
          g.partner.push(recipe);
        }
      });
      // mutual
      map.forEach((g) => {
        const partnerIds = new Set(g.partner.map((r) => r.id));
        g.mutual = g.mine.map((m) => m.recipe).filter((r) => partnerIds.has(r.id));
      });
      setGroups(Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date)));
      setLoading(false);
    };
    load();
  }, [user]);

  const setFinal = async (date: string, recipeId: string) => {
    if (!user) return;
    await supabase.from("meal_plans").upsert(
      { user_id: user.id, plan_date: date, final_recipe_id: recipeId },
      { onConflict: "user_id,plan_date" }
    );
    toast.success("Decision saved!");
    setGroups((prev) =>
      prev.map((g) =>
        g.date === date ? { ...g, mine: g.mine.map((m) => ({ ...m, final: m.recipe.id === recipeId })) } : g
      )
    );
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-md mx-auto w-full px-5 pt-6 animate-fade-in">
      <header className="mb-6">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider">Suggestions & matches</p>
        <h1 className="text-3xl font-display font-extrabold mt-1">Matches</h1>
        <p className="text-muted-foreground mt-1">
          {hasPartner
            ? "It's only a real match when you both pick the same recipe."
            : "Connect a partner in your profile to turn picks into matches."}
        </p>
        {hasPartner && (
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/15 text-accent-foreground border border-accent/30">
              <Sparkles className="h-3 w-3" /> Match — you both liked it
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
              Suggestion — only one of you liked it
            </span>
          </div>
        )}
      </header>

      {groups.length === 0 ? (
        <div className="text-center py-16">
          <div className="h-20 w-20 rounded-full bg-muted grid place-items-center mx-auto mb-4">
            <Heart className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="font-display font-bold text-xl">No likes yet</h2>
          <p className="text-muted-foreground mt-2 mb-6">Plan a day and start swiping to fill this space.</p>
          <Button variant="hero" onClick={() => navigate("/plan")}>Plan a meal</Button>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.date} className="mb-8">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-display font-bold text-lg">{fmtDayLong(parseISO(g.date))}</h2>
              {g.mutual.length > 0 ? (
                <Badge className="bg-accent text-accent-foreground"><Sparkles className="h-3 w-3 mr-1" />{g.mutual.length} match{g.mutual.length > 1 ? "es" : ""}</Badge>
              ) : hasPartner ? (
                <Badge variant="outline" className="text-muted-foreground">No match yet</Badge>
              ) : null}
            </div>

            {hasPartner && g.mutual.length === 0 && (
              <p className="text-xs text-muted-foreground mb-3 italic">
                Keep swiping — a match happens when you both like the same recipe.
              </p>
            )}

            {hasPartner && (
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                {g.mutual.length > 0 ? "Matches & suggestions" : "Suggestions"}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              {g.mine.map(({ recipe, final }) => {
                const isMutual = g.mutual.some((r) => r.id === recipe.id);
                return (
                  <button
                    key={recipe.id}
                    onClick={() => navigate(`/recipe/${recipe.id}?date=${g.date}`)}
                    className={cn(
                      "text-left rounded-2xl overflow-hidden bg-card shadow-soft active:scale-[0.98] transition-transform relative",
                      isMutual && "ring-2 ring-accent"
                    )}
                  >
                    <div className="aspect-square relative">
                      <img src={recipe.image_url ?? ""} alt={recipe.title} className={cn("absolute inset-0 w-full h-full object-cover", !isMutual && hasPartner && "opacity-90")} loading="lazy" />
                      {isMutual ? (
                        <span className="absolute top-2 left-2 bg-accent text-accent-foreground text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full flex items-center gap-1"><Sparkles className="h-3 w-3" /> Match</span>
                      ) : hasPartner ? (
                        <span className="absolute top-2 left-2 bg-background/90 text-foreground text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full border border-border">Your pick</span>
                      ) : null}
                      {final && <span className="absolute top-2 right-2 bg-success text-success-foreground text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full">Picked</span>}
                    </div>
                    <div className="p-3">
                      <p className="font-display font-bold text-sm leading-tight line-clamp-2">{recipe.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{recipe.cooking_time_minutes} min · {recipe.category}</p>
                      <Button
                        variant={final ? "secondary" : "outline"}
                        size="sm"
                        className="w-full mt-2 h-8 text-xs"
                        onClick={(e) => { e.stopPropagation(); setFinal(g.date, recipe.id); }}
                      >
                        {final ? "Final pick ✓" : "Make it final"}
                      </Button>
                    </div>
                  </button>
                );
              })}
              {hasPartner && g.partner.filter((p) => !g.mine.some((m) => m.recipe.id === p.id)).map((recipe) => (
                <button
                  key={`p-${recipe.id}`}
                  onClick={() => navigate(`/recipe/${recipe.id}?date=${g.date}`)}
                  className="text-left rounded-2xl overflow-hidden bg-card shadow-soft border-2 border-dashed border-border relative"
                >
                  <div className="aspect-square relative">
                    <img src={recipe.image_url ?? ""} alt={recipe.title} className="absolute inset-0 w-full h-full object-cover opacity-90" loading="lazy" />
                    <span className="absolute top-2 left-2 bg-secondary text-secondary-foreground text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full">Partner</span>
                  </div>
                  <div className="p-3">
                    <p className="font-display font-bold text-sm leading-tight line-clamp-2">{recipe.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{recipe.cooking_time_minutes} min</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
};

export default Matches;
