import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import fallbackRecipeImage from "@/assets/hero-pasta.jpg";
import { Loader2, Sparkles, Plus, Link2, Share2, Eye, BookOpen, Heart, Bookmark, Users, FileText, TrendingUp, Activity } from "lucide-react";
import { toast } from "sonner";
import { subDays, formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

type Creator = Tables<"food_creators">;
type Recipe = Tables<"recipes">;

const Thumb = ({ url, alt, size = 40 }: { url: string | null; alt: string; size?: number }) => {
  const [broken, setBroken] = useState(false);
  const px = `${size}px`;
  const src = url && !broken ? url : fallbackRecipeImage;
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setBroken(true)}
      className="rounded-xl object-cover bg-muted shrink-0"
      style={{ width: px, height: px }}
    />
  );
};

const CreatorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [stats, setStats] = useState({ views: 0, viewsPrev: 0, likes: 0, saves: 0, followers: 0 });
  const [perRecipeViews, setPerRecipeViews] = useState<Record<string, { recent: number; prev: number }>>({});
  const [activity, setActivity] = useState<{ kind: string; recipeTitle: string; at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);

  const importRecipe = async () => {
    if (!creator) return;
    const u = importUrl.trim();
    if (!u) return toast.error("Plak eerst een recept-URL");
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("import-recipe", { body: { url: u } });
      let payload: any = data;
      if (error && (error as any).context?.json) {
        try { payload = await (error as any).context.json(); } catch { /* ignore */ }
      }
      if (payload?.error === "not_a_recipe") { toast.error("Dit lijkt geen recept te zijn."); return; }
      if (error) throw error;
      const r = payload?.recipe;
      if (!r) throw new Error("Geen recept-data ontvangen");
      const { error: insErr } = await supabase.from("recipes").insert({
        creator_id: creator.id,
        title: r.title, description: r.description ?? null, image_url: r.image_url ?? null,
        category: r.category ?? "dinner", cuisine: r.cuisine ?? null,
        difficulty: r.difficulty ?? "medium", cooking_time_minutes: r.cooking_time_minutes ?? 30,
        servings: r.servings ?? 2, ingredients: r.ingredients ?? [], instructions: r.instructions ?? [],
        content_source: "imported", creator_approved: false, published: false,
      });
      if (insErr) throw insErr;
      toast.success("Recept geïmporteerd");
      setImportUrl("");
      load();
    } catch (e) {
      toast.error(`Import mislukt: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setImporting(false);
    }
  };

  const load = async () => {
    if (!user) return;
    const { data: c } = await supabase.from("food_creators").select("*").eq("user_id", user.id).maybeSingle();
    setCreator(c);
    if (!c) { setLoading(false); return; }
    const { data: r } = await supabase.from("recipes").select("*").eq("creator_id", c.id).order("created_at", { ascending: false });
    const list = (r ?? []) as Recipe[];
    setRecipes(list);
    const ids = list.map((x) => x.id);

    if (ids.length) {
      const sevenAgo = subDays(new Date(), 7).toISOString();
      const fourteenAgo = subDays(new Date(), 14).toISOString();
      const [{ data: views }, { data: likes }, { data: saves }, { data: followers }] = await Promise.all([
        supabase.from("recipe_views").select("recipe_id, created_at").in("recipe_id", ids).gte("created_at", fourteenAgo),
        supabase.from("swipes").select("recipe_id, created_at, liked").in("recipe_id", ids).eq("liked", true).order("created_at", { ascending: false }).limit(50),
        supabase.from("favorites").select("recipe_id, created_at").in("recipe_id", ids).order("created_at", { ascending: false }).limit(50),
        supabase.from("creator_followers").select("id").eq("creator_id", c.id),
      ]);
      const viewsRecent = (views ?? []).filter((v) => v.created_at >= sevenAgo);
      const viewsPrev = (views ?? []).filter((v) => v.created_at < sevenAgo);
      setStats({
        views: viewsRecent.length,
        viewsPrev: viewsPrev.length,
        likes: likes?.length ?? 0,
        saves: saves?.length ?? 0,
        followers: followers?.length ?? 0,
      });
      const perR: Record<string, { recent: number; prev: number }> = {};
      ids.forEach((id) => (perR[id] = { recent: 0, prev: 0 }));
      viewsRecent.forEach((v) => perR[v.recipe_id] && perR[v.recipe_id].recent++);
      viewsPrev.forEach((v) => perR[v.recipe_id] && perR[v.recipe_id].prev++);
      setPerRecipeViews(perR);

      const titleMap = Object.fromEntries(list.map((x) => [x.id, x.title]));
      const acts: { kind: string; recipeTitle: string; at: string }[] = [
        ...(likes ?? []).slice(0, 5).map((l) => ({ kind: "Like", recipeTitle: titleMap[l.recipe_id] ?? "?", at: l.created_at })),
        ...(saves ?? []).slice(0, 5).map((s) => ({ kind: "Save", recipeTitle: titleMap[s.recipe_id] ?? "?", at: s.created_at })),
      ].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 8);
      setActivity(acts);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const totalPublished = recipes.filter((r) => r.published && r.creator_approved).length;
  const totalDrafts = recipes.filter((r) => !r.published || !r.creator_approved).length;

  const topPerforming = useMemo(() => {
    return [...recipes]
      .map((r) => ({ r, views: perRecipeViews[r.id]?.recent ?? 0 }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 3);
  }, [recipes, perRecipeViews]);

  const fastestGrowing = useMemo(() => {
    return [...recipes]
      .map((r) => {
        const s = perRecipeViews[r.id];
        const growth = s ? s.recent - s.prev : 0;
        return { r, growth, recent: s?.recent ?? 0 };
      })
      .filter((x) => x.growth > 0)
      .sort((a, b) => b.growth - a.growth)
      .slice(0, 3);
  }, [recipes, perRecipeViews]);

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!creator) {
    return (
      <div className="max-w-md mx-auto px-5 py-10 text-center">
        <p className="text-muted-foreground mb-4">Je hebt nog geen creator-profiel.</p>
        <Button onClick={() => navigate("/")}>Terug</Button>
      </div>
    );
  }

  const statTiles = [
    { label: "Recepten", value: recipes.length, icon: BookOpen },
    { label: "Gepubliceerd", value: totalPublished, icon: Eye },
    { label: "Concepten", value: totalDrafts, icon: FileText },
    { label: "Views 7d", value: stats.views, icon: TrendingUp },
    { label: "Likes", value: stats.likes, icon: Heart },
    { label: "Saves", value: stats.saves, icon: Bookmark },
    { label: "Volgers", value: stats.followers, icon: Users },
  ];

  return (
    <div className="max-w-2xl mx-auto px-5 py-6 pb-24 animate-fade-in">
      <div className="bg-gradient-to-br from-primary/10 via-card to-card rounded-3xl p-5 shadow-card mb-5">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <h1 className="font-display font-extrabold text-xl">Hi {creator.name} 👋</h1>
            <p className="text-sm text-muted-foreground mt-1">Welkom in je Creator workspace.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-5">
        {statTiles.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-card rounded-2xl p-3 shadow-soft text-center">
            <Icon className="h-4 w-4 text-primary mx-auto mb-1" />
            <div className="font-display font-extrabold text-lg leading-none">{value}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-5">
        <Button variant="hero" onClick={() => navigate(`/creator/${creator.id}/recipes/new`)} className="h-auto py-3 flex-col gap-1">
          <Plus className="h-4 w-4" /> <span className="text-xs">Nieuw recept</span>
        </Button>
        <Button variant="outline" onClick={() => navigate("/creator/inspiration")} className="h-auto py-3 flex-col gap-1">
          <Share2 className="h-4 w-4" /> <span className="text-xs">Social koppelen</span>
        </Button>
        <Button variant="outline" onClick={() => navigate("/creator/recipes")} className="h-auto py-3 flex-col gap-1">
          <BookOpen className="h-4 w-4" /> <span className="text-xs">Mijn recepten</span>
        </Button>
        <Button variant="outline" onClick={() => navigate(`/creator/${creator.id}`)} className="h-auto py-3 flex-col gap-1">
          <Eye className="h-4 w-4" /> <span className="text-xs">Bekijk MyKitchen</span>
        </Button>
      </div>

      <div className="bg-card rounded-2xl p-4 shadow-soft mb-5">
        <div className="flex items-center gap-2 mb-2">
          <Link2 className="h-4 w-4 text-primary" />
          <h2 className="font-display font-bold text-sm">Importeer een recept via link</h2>
        </div>
        <div className="flex gap-2">
          <Input placeholder="https://..." value={importUrl} onChange={(e) => setImportUrl(e.target.value)} disabled={importing} />
          <Button onClick={importRecipe} disabled={importing} variant="hero">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Importeer"}
          </Button>
        </div>
      </div>

      {topPerforming.some((x) => x.views > 0) && (
        <section className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="font-display font-bold">Top prestaties (7d)</h2>
          </div>
          <ul className="space-y-2">
            {topPerforming.filter((x) => x.views > 0).map(({ r, views }) => (
              <li key={r.id} className="bg-card rounded-2xl p-3 shadow-soft flex items-center gap-3">
                <Thumb url={r.image_url} alt={r.title} />
                <Link to={`/recipe/${r.id}`} className="flex-1 min-w-0 font-semibold text-sm truncate hover:text-primary">{r.title}</Link>
                <span className="text-xs font-bold text-primary">{views} views</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {fastestGrowing.length > 0 && (
        <section className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-accent" />
            <h2 className="font-display font-bold">Snelst groeiend</h2>
          </div>
          <ul className="space-y-2">
            {fastestGrowing.map(({ r, growth, recent }) => (
              <li key={r.id} className="bg-card rounded-2xl p-3 shadow-soft flex items-center gap-3">
                <Thumb url={r.image_url} alt={r.title} />
                <Link to={`/recipe/${r.id}`} className="flex-1 min-w-0 font-semibold text-sm truncate hover:text-primary">{r.title}</Link>
                <span className="text-xs font-bold text-accent">+{growth}</span>
                <span className="text-[10px] text-muted-foreground">{recent} views</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {activity.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="font-display font-bold">Recente activiteit</h2>
          </div>
          <ul className="bg-card rounded-2xl shadow-soft overflow-hidden">
            {activity.map((a, idx) => (
              <li key={idx} className={`p-3 flex items-center gap-3 text-sm ${idx > 0 ? "border-t border-border" : ""}`}>
                {a.kind === "Like" ? <Heart className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4 text-accent" />}
                <span className="flex-1 truncate">
                  <span className="font-semibold">{a.kind}</span> op <span className="text-muted-foreground">{a.recipeTitle}</span>
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(a.at), { addSuffix: true, locale: nl })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default CreatorDashboard;
