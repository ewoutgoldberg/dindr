import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Pencil, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Creator = Tables<"food_creators">;
type Recipe = Tables<"recipes">;

const CreatorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

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

      <section className="mb-6">
        <h2 className="font-display font-bold mb-3">Suggested recipes</h2>
        {drafts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing waiting for review.</p>
        ) : (
          <ul className="space-y-2">
            {drafts.map((r) => (
              <li key={r.id} className="bg-card rounded-2xl p-3 shadow-soft flex items-center gap-3">
                <img src={r.image_url ?? ""} alt="" className="h-14 w-14 rounded-xl object-cover bg-muted shrink-0" />
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
                <img src={r.image_url ?? ""} alt="" className="h-12 w-12 rounded-xl object-cover bg-muted shrink-0" />
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
