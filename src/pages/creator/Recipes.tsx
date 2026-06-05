import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Plus, MoreVertical, Pencil, Copy, Archive, ArchiveRestore, Eye, EyeOff, Trash2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import fallbackRecipeImage from "@/assets/hero-pasta.jpg";

type Recipe = Tables<"recipes">;
type Filter = "all" | "drafts" | "review" | "published" | "archived";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Alles" },
  { key: "drafts", label: "Concepten" },
  { key: "review", label: "Review" },
  { key: "published", label: "Gepubliceerd" },
  { key: "archived", label: "Gearchiveerd" },
];

const statusOf = (r: Recipe): Exclude<Filter, "all"> => {
  if (r.archived) return "archived";
  if (r.published && r.creator_approved) return "published";
  if (!r.creator_approved && r.content_source === "imported") return "review";
  return "drafts";
};

const statusLabel = (s: Exclude<Filter, "all">) =>
  ({ drafts: "Concept", review: "Review", published: "Gepubliceerd", archived: "Gearchiveerd" }[s]);

const Thumb = ({ url, alt }: { url: string | null; alt: string }) => {
  const [broken, setBroken] = useState(false);
  const src = url && !broken ? url : fallbackRecipeImage;
  if (!src) {
    return (
      <div className="w-14 h-14 rounded-xl bg-muted grid place-items-center text-muted-foreground shrink-0">
        <ImageIcon className="h-5 w-5" />
      </div>
    );
  }
  return <img src={src} alt={alt} onError={() => setBroken(true)} className="w-14 h-14 rounded-xl object-cover bg-muted shrink-0" />;
};

const CreatorRecipes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [stats, setStats] = useState<Record<string, { views: number; likes: number; saves: number }>>({});
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data: c } = await supabase.from("food_creators").select("id").eq("user_id", user.id).maybeSingle();
    if (!c) {
      setLoading(false);
      return;
    }
    setCreatorId(c.id);
    const { data: r } = await supabase
      .from("recipes")
      .select("*")
      .eq("creator_id", c.id)
      .order("created_at", { ascending: false });
    const list = (r ?? []) as Recipe[];
    setRecipes(list);
    if (list.length) {
      const ids = list.map((x) => x.id);
      const [{ data: views }, { data: likes }, { data: saves }] = await Promise.all([
        supabase.from("recipe_views").select("recipe_id").in("recipe_id", ids),
        supabase.from("swipes").select("recipe_id").in("recipe_id", ids).eq("liked", true),
        supabase.from("favorites").select("recipe_id").in("recipe_id", ids),
      ]);
      const tally: Record<string, { views: number; likes: number; saves: number }> = {};
      ids.forEach((id) => (tally[id] = { views: 0, likes: 0, saves: 0 }));
      views?.forEach((v) => tally[v.recipe_id] && tally[v.recipe_id].views++);
      likes?.forEach((v) => tally[v.recipe_id] && tally[v.recipe_id].likes++);
      saves?.forEach((v) => tally[v.recipe_id] && tally[v.recipe_id].saves++);
      setStats(tally);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [user]);

  const filtered = useMemo(() => {
    if (filter === "all") return recipes;
    return recipes.filter((r) => statusOf(r) === filter);
  }, [recipes, filter]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: recipes.length, drafts: 0, review: 0, published: 0, archived: 0 };
    recipes.forEach((r) => c[statusOf(r)]++);
    return c;
  }, [recipes]);

  const duplicate = async (r: Recipe) => {
    if (!creatorId) return;
    const { id, created_at, ...rest } = r;
    void id; void created_at;
    const { error } = await supabase.from("recipes").insert({
      ...rest,
      title: `${r.title} (kopie)`,
      published: false,
      creator_approved: false,
      archived: false,
    });
    if (error) return toast.error(error.message);
    toast.success("Recept gedupliceerd");
    load();
  };

  const togglePublish = async (r: Recipe) => {
    const next = !(r.published && r.creator_approved);
    const { error } = await supabase
      .from("recipes")
      .update({ published: next, creator_approved: next ? true : r.creator_approved, archived: next ? false : r.archived })
      .eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success(next ? "Gepubliceerd" : "Offline gehaald");
    load();
  };

  const toggleArchive = async (r: Recipe) => {
    const next = !r.archived;
    const { error } = await supabase
      .from("recipes")
      .update({ archived: next, published: next ? false : r.published })
      .eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success(next ? "Gearchiveerd" : "Teruggezet");
    load();
  };

  const remove = async (r: Recipe) => {
    if (!confirm(`"${r.title}" definitief verwijderen?`)) return;
    const { error } = await supabase.from("recipes").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Verwijderd");
    load();
  };

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
          <h1 className="font-display font-extrabold text-2xl">Recepten</h1>
          <p className="text-xs text-muted-foreground">{recipes.length} totaal</p>
        </div>
        <Button onClick={() => navigate(`/creator/${creatorId}/recipes/new`)} variant="hero" size="sm">
          <Plus className="h-4 w-4" /> Nieuw
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1 scrollbar-hide">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {f.label} <span className="opacity-70">· {counts[f.key]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 text-center shadow-soft">
          <p className="text-sm text-muted-foreground">Geen recepten in deze filter.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => {
            const s = statusOf(r);
            const st = stats[r.id] ?? { views: 0, likes: 0, saves: 0 };
            return (
              <li key={r.id} className="bg-card rounded-2xl p-3 shadow-soft flex items-center gap-3">
                <Thumb url={r.image_url} alt={r.title} />
                <div className="flex-1 min-w-0">
                  <Link to={`/recipe/${r.id}`} className="font-semibold text-sm truncate block hover:text-primary">
                    {r.title}
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-2 py-0 h-5 ${
                        s === "published"
                          ? "bg-primary/10 text-primary"
                          : s === "review"
                          ? "bg-accent/10 text-accent"
                          : s === "archived"
                          ? "bg-muted text-muted-foreground"
                          : "bg-muted/60 text-foreground/70"
                      }`}
                    >
                      {statusLabel(s)}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {st.views} views · {st.likes} likes · {st.saves} saves
                    </span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => navigate(`/creator/${creatorId}/recipes/${r.id}`)}>
                      <Pencil className="h-4 w-4 mr-2" /> Bewerken
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => duplicate(r)}>
                      <Copy className="h-4 w-4 mr-2" /> Dupliceren
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => togglePublish(r)}>
                      {r.published && r.creator_approved ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-2" /> Offline halen
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" /> Publiceren
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleArchive(r)}>
                      {r.archived ? (
                        <>
                          <ArchiveRestore className="h-4 w-4 mr-2" /> Terugzetten
                        </>
                      ) : (
                        <>
                          <Archive className="h-4 w-4 mr-2" /> Archiveren
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => remove(r)} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" /> Verwijderen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default CreatorRecipes;
