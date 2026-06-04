import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import fallbackRecipeImage from "@/assets/hero-pasta.jpg";

import { Loader2, CheckCircle2, Pencil, Sparkles, ImageIcon, Link2 } from "lucide-react";
import { toast } from "sonner";
import { SocialAccountsManager } from "@/components/SocialAccountsManager";

type Creator = Tables<"food_creators">;
type Recipe = Tables<"recipes">;

const RecipeThumb = ({ url, alt, size = 56 }: { url: string | null; alt: string; size?: number }) => {
  const [broken, setBroken] = useState(false);
  const px = `${size}px`;
  const src = url && !broken ? url : fallbackRecipeImage;

  if (!src) {
    return (
      <div className="rounded-xl bg-muted shrink-0 grid place-items-center text-muted-foreground" style={{ width: px, height: px }}>
        <ImageIcon className="h-5 w-5" />
      </div>
    );
  }
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
  const [loading, setLoading] = useState(true);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);

  const importRecipe = async () => {
    if (!creator) return;
    const u = importUrl.trim();
    if (!u) return toast.error("Paste a recipe URL first");
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("import-recipe", {
        body: { url: u },
      });
      // Try to read structured error body when the function returned non-2xx
      let payload: any = data;
      if (error && (error as any).context?.json) {
        try { payload = await (error as any).context.json(); } catch { /* ignore */ }
      } else if (error && (error as any).context?.text) {
        try { payload = JSON.parse(await (error as any).context.text()); } catch { /* ignore */ }
      }
      if (payload?.error === "not_a_recipe") {
        toast.error("That page doesn't look like a recipe. Try a direct recipe link.");
        return;
      }
      if (payload?.error === "rate_limited") {
        toast.error("Too many imports right now — try again in a minute.");
        return;
      }
      if (error) throw error;
      if (payload?.error) throw new Error(payload.error);
      const r = payload?.recipe;
      if (!r) throw new Error("No recipe data returned");
      const { error: insErr } = await supabase.from("recipes").insert({
        creator_id: creator.id,
        title: r.title,
        description: r.description ?? null,
        image_url: r.image_url ?? null,
        category: r.category ?? "dinner",
        cuisine: r.cuisine ?? null,
        difficulty: r.difficulty ?? "medium",
        cooking_time_minutes: r.cooking_time_minutes ?? 30,
        servings: r.servings ?? 2,
        ingredients: r.ingredients ?? [],
        instructions: r.instructions ?? [],
        content_source: "imported",
        creator_approved: false,
        published: false,
      });
      if (insErr) throw insErr;
      toast.success("Recipe imported — review it under drafts");
      setImportUrl("");
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Import failed: ${msg}`);
    } finally {
      setImporting(false);
    }
  };

  const load = async () => {
    if (!user) return;
    const { data: c } = await supabase.from("food_creators").select("*").eq("user_id", user.id).maybeSingle();
    setCreator(c);
    if (c) {
      const { data: r } = await supabase.from("recipes").select("*").eq("creator_id", c.id).order("created_at", { ascending: false });
      setRecipes(r ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const approve = async (id: string) => {
    const { error } = await supabase.from("recipes").update({ creator_approved: true, published: true }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Recipe published");
    load();
  };

  const togglePublish = async (r: Recipe) => {
    const { error } = await supabase.from("recipes").update({ published: !r.published }).eq("id", r.id);
    if (error) return toast.error(error.message);
    load();
  };

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!creator) {
    return (
      <div className="max-w-md mx-auto px-5 py-10 text-center">
        <p className="text-muted-foreground mb-4">You don't have a creator profile yet.</p>
        <Button onClick={() => navigate("/")}>Back home</Button>
      </div>
    );
  }

  const drafts = recipes.filter((r) => !r.creator_approved || !r.published);
  const published = recipes.filter((r) => r.published && r.creator_approved);

  const profileComplete = [creator.name, creator.bio, creator.avatar_url, creator.specialty].filter(Boolean).length;

  return (
    <div className="max-w-2xl mx-auto px-5 py-6 pb-24 animate-fade-in">
      <div className="bg-card rounded-3xl p-5 shadow-card mb-5">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <h1 className="font-display font-extrabold text-xl">Welkom op Dindr, {creator.name} 👋</h1>
            <p className="text-sm text-muted-foreground mt-1">
              We hebben alvast een profiel en recepten voor je voorbereid. Bekijk, pas aan of publiceer ze hieronder.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <div className="font-display font-extrabold text-lg">{profileComplete}/4</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Profile</div>
          </div>
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <div className="font-display font-extrabold text-lg">{drafts.length}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Drafts</div>
          </div>
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <div className="font-display font-extrabold text-lg">{published.length}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Published</div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-4 shadow-soft mb-5">
        <div className="flex items-center gap-2 mb-2">
          <Link2 className="h-4 w-4 text-primary" />
          <h2 className="font-display font-bold text-sm">Import a recipe from a link</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          Paste a link to one of your recipes (blog, Instagram, TikTok, YouTube) and we'll add it as a draft.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="https://..."
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            disabled={importing}
          />
          <Button onClick={importRecipe} disabled={importing} variant="hero">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Import"}
          </Button>
        </div>
      </div>
      <div className="mb-5">
        <SocialAccountsManager creatorId={creator.id} />
      </div>


      <section className="mb-6">
        <h2 className="font-display font-bold mb-3">Suggested recipes</h2>
        {drafts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing waiting for review.</p>
        ) : (
          <ul className="space-y-2">
            {drafts.map((r) => (
              <li key={r.id} className="bg-card rounded-2xl p-3 shadow-soft flex items-center gap-3">
                <RecipeThumb url={r.image_url} alt={r.title} size={56} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.content_source}</p>
                </div>
                <Button asChild size="icon" variant="ghost"><Link to={`/recipe/${r.id}`}><Pencil className="h-4 w-4" /></Link></Button>
                <Button size="sm" variant="hero" onClick={() => approve(r.id)}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-display font-bold mb-3">Published</h2>
        {published.length === 0 ? (
          <p className="text-sm text-muted-foreground">No published recipes yet.</p>
        ) : (
          <ul className="space-y-2">
            {published.map((r) => (
              <li key={r.id} className="bg-card rounded-2xl p-3 shadow-soft flex items-center gap-3">
                <RecipeThumb url={r.image_url} alt={r.title} size={48} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{r.title}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => togglePublish(r)}>Unpublish</Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default CreatorDashboard;
