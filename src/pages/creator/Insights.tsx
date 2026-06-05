import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";
import { Loader2, TrendingUp, Lightbulb, Eye, Heart, Bookmark, Share2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { format, subDays, startOfDay } from "date-fns";

type Recipe = Tables<"recipes">;
type Period = 7 | 30 | 90;

type Event = { recipe_id: string; created_at: string };

const Insights = () => {
  const { user } = useAuth();
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [views, setViews] = useState<Event[]>([]);
  const [likes, setLikes] = useState<(Event & { liked: boolean })[]>([]);
  const [saves, setSaves] = useState<Event[]>([]);
  const [shares, setShares] = useState<Event[]>([]);
  const [period, setPeriod] = useState<Period>(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: c } = await supabase.from("food_creators").select("id").eq("user_id", user.id).maybeSingle();
      if (!c) {
        setLoading(false);
        return;
      }
      setCreatorId(c.id);
      const { data: r } = await supabase.from("recipes").select("*").eq("creator_id", c.id);
      const list = (r ?? []) as Recipe[];
      setRecipes(list);
      if (list.length) {
        const ids = list.map((x) => x.id);
        const [v, l, s, sh] = await Promise.all([
          supabase.from("recipe_views").select("recipe_id, created_at").in("recipe_id", ids),
          supabase.from("swipes").select("recipe_id, created_at, liked").in("recipe_id", ids),
          supabase.from("favorites").select("recipe_id, created_at").in("recipe_id", ids),
          supabase.from("recipe_shares").select("recipe_id, created_at").in("recipe_id", ids),
        ]);
        setViews((v.data ?? []) as Event[]);
        setLikes((l.data ?? []) as (Event & { liked: boolean })[]);
        setSaves((s.data ?? []) as Event[]);
        setShares((sh.data ?? []) as Event[]);
      }
      setLoading(false);
    })();
  }, [user]);

  const cutoff = useMemo(() => subDays(new Date(), period), [period]);

  const inPeriod = <T extends Event>(arr: T[]) => arr.filter((x) => new Date(x.created_at) >= cutoff);

  const perRecipe = useMemo(() => {
    return recipes.map((r) => {
      const rv = views.filter((v) => v.recipe_id === r.id && new Date(v.created_at) >= cutoff).length;
      const rSwipes = likes.filter((v) => v.recipe_id === r.id && new Date(v.created_at) >= cutoff);
      const rl = rSwipes.filter((x) => x.liked).length;
      const rdis = rSwipes.filter((x) => !x.liked).length;
      const total = rl + rdis;
      const rs = saves.filter((v) => v.recipe_id === r.id && new Date(v.created_at) >= cutoff).length;
      const rsh = shares.filter((v) => v.recipe_id === r.id && new Date(v.created_at) >= cutoff).length;
      return {
        recipe: r,
        views: rv,
        likes: rl,
        saves: rs,
        shares: rsh,
        rightPct: total > 0 ? Math.round((rl / total) * 100) : 0,
        leftPct: total > 0 ? Math.round((rdis / total) * 100) : 0,
      };
    }).sort((a, b) => b.views - a.views);
  }, [recipes, views, likes, saves, shares, cutoff]);

  const chartData = useMemo(() => {
    const days: { date: string; views: number; engagement: number }[] = [];
    for (let i = period - 1; i >= 0; i--) {
      const day = startOfDay(subDays(new Date(), i));
      const key = format(day, "yyyy-MM-dd");
      const dayViews = views.filter((v) => format(startOfDay(new Date(v.created_at)), "yyyy-MM-dd") === key).length;
      const dayEng =
        likes.filter((v) => v.liked && format(startOfDay(new Date(v.created_at)), "yyyy-MM-dd") === key).length +
        saves.filter((v) => format(startOfDay(new Date(v.created_at)), "yyyy-MM-dd") === key).length;
      days.push({ date: format(day, "dd/MM"), views: dayViews, engagement: dayEng });
    }
    return days;
  }, [views, likes, saves, period]);

  const insights = useMemo(() => {
    const out: string[] = [];
    const quick = recipes.filter((r) => (r.cooking_time_minutes ?? 0) <= 20);
    const slow = recipes.filter((r) => (r.cooking_time_minutes ?? 0) > 20);
    const saveRate = (arr: Recipe[]) => {
      const ids = new Set(arr.map((r) => r.id));
      const v = views.filter((x) => ids.has(x.recipe_id)).length || 1;
      const s = saves.filter((x) => ids.has(x.recipe_id)).length;
      return s / v;
    };
    if (quick.length && slow.length) {
      const q = saveRate(quick);
      const s = saveRate(slow);
      if (q > s * 1.15) {
        const pct = Math.round(((q - s) / Math.max(s, 0.0001)) * 100);
        out.push(`Recepten onder 20 minuten worden ${pct}% vaker opgeslagen.`);
      }
    }
    const top = perRecipe[0];
    if (top && top.views > 0) {
      out.push(`"${top.recipe.title}" is je best presterende recept met ${top.views} views.`);
    }
    const vegRecipes = recipes.filter((r) =>
      (r.cuisine ?? "").toLowerCase().includes("veg") || (r.title ?? "").toLowerCase().includes("veg"),
    );
    if (vegRecipes.length >= 2) {
      out.push(`Je hebt ${vegRecipes.length} vegetarische recepten — een groeiende categorie binnen Dindr.`);
    }
    if (out.length === 0) {
      out.push("Verzamel meer data: deel je recepten en kom over een paar dagen terug voor inzichten.");
    }
    return out;
  }, [recipes, views, saves, perRecipe]);

  const totals = useMemo(
    () => ({
      views: inPeriod(views).length,
      likes: inPeriod(likes).filter((x) => x.liked).length,
      saves: inPeriod(saves).length,
      shares: inPeriod(shares).length,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [views, likes, saves, shares, cutoff],
  );

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!creatorId) {
    return (
      <div className="max-w-md mx-auto px-5 py-10 text-center">
        <p className="text-muted-foreground">Geen creator-profiel gevonden.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-6 pb-24 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl">Inzichten</h1>
          <p className="text-xs text-muted-foreground">Hoe je recepten presteren</p>
        </div>
        <div className="flex gap-1 bg-muted rounded-full p-1">
          {[7, 30, 90].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p as Period)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                period === p ? "bg-card shadow-sm" : "text-muted-foreground"
              }`}
            >
              {p}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-5">
        {[
          { label: "Views", value: totals.views, icon: Eye },
          { label: "Likes", value: totals.likes, icon: Heart },
          { label: "Saves", value: totals.saves, icon: Bookmark },
          { label: "Shares", value: totals.shares, icon: Share2 },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-card rounded-2xl p-3 shadow-soft text-center">
            <Icon className="h-4 w-4 text-primary mx-auto mb-1" />
            <div className="font-display font-extrabold text-lg leading-none">{value}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-2xl p-4 shadow-soft mb-5">
        <h2 className="font-display font-bold text-sm mb-3">Groei & engagement</h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Views" />
              <Line type="monotone" dataKey="engagement" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} name="Engagement" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="h-4 w-4 text-accent" />
          <h2 className="font-display font-bold">Slimme inzichten</h2>
        </div>
        <div className="space-y-2">
          {insights.map((i, idx) => (
            <div key={idx} className="bg-card rounded-2xl p-3 shadow-soft text-sm border-l-4 border-accent">
              {i}
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="font-display font-bold">Per recept</h2>
        </div>
        {perRecipe.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nog geen recepten.</p>
        ) : (
          <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
            {perRecipe.map((row, idx) => (
              <div key={row.recipe.id} className={`p-3 ${idx > 0 ? "border-t border-border" : ""}`}>
                <p className="font-semibold text-sm truncate mb-1">{row.recipe.title}</p>
                <div className="grid grid-cols-6 gap-2 text-[10px] text-muted-foreground">
                  <div><div className="font-bold text-foreground">{row.views}</div>views</div>
                  <div><div className="font-bold text-foreground">{row.likes}</div>likes</div>
                  <div><div className="font-bold text-foreground">{row.saves}</div>saves</div>
                  <div><div className="font-bold text-foreground">{row.shares}</div>shares</div>
                  <div><div className="font-bold text-foreground">{row.rightPct}%</div>right</div>
                  <div><div className="font-bold text-foreground">{row.leftPct}%</div>left</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Insights;
