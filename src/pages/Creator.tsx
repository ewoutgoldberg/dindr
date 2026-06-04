import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, ChefHat, MapPin, Loader2 } from "lucide-react";
import { SocialIcons } from "@/components/CreatorCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InspirationFeed } from "@/components/InspirationFeed";
import fallbackRecipeImage from "@/assets/hero-pasta.jpg";

const RecipeImg = ({ url, alt }: { url: string | null; alt: string }) => {
  const [broken, setBroken] = useState(false);
  const src = url && !broken ? url : fallbackRecipeImage;
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setBroken(true)}
      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
    />
  );
};

type Creator = Tables<"food_creators">;
type Recipe = Tables<"recipes">;

const Creator = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      const [{ data: c }, { data: r }] = await Promise.all([
        supabase.from("food_creators").select("*").eq("id", id).maybeSingle(),
        supabase.from("recipes").select("*").eq("creator_id", id).order("created_at", { ascending: false }),
      ]);
      setCreator(c);
      setRecipes(r ?? []);
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!creator) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Creator not found</div>;
  }

  return (
    <div className="min-h-screen bg-background pb-24 animate-fade-in">
      <div className="relative h-64 overflow-hidden bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/30">
        <img
          src={creator.avatar_url ?? ""}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-40 blur-2xl scale-110"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 bg-background/40 backdrop-blur hover:bg-background/60"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      <div className="max-w-md mx-auto px-5 -mt-20 relative">
        <div className="flex flex-col items-center text-center">
          <img
            src={creator.avatar_url ?? ""}
            alt={creator.name}
            className="h-32 w-32 rounded-full object-cover ring-4 ring-background shadow-glow"
          />
          <h1 className="font-display font-extrabold text-3xl mt-4">{creator.name}</h1>
          <p className="text-sm text-primary font-semibold">@{creator.handle}</p>
          {creator.location && (
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {creator.location}
            </p>
          )}
          {creator.specialty && (
            <Badge variant="secondary" className="mt-3 rounded-full">
              {creator.specialty}
            </Badge>
          )}

          <div className="mt-5">
            <SocialIcons creator={creator} size="lg" />
          </div>
        </div>

        {creator.bio && (
          <p className="text-center text-foreground mt-6 italic">"{creator.bio}"</p>
        )}

        {creator.story && (
          <section className="mt-6 bg-card rounded-3xl p-5 shadow-soft">
            <h2 className="font-display font-bold text-lg mb-2">My story</h2>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{creator.story}</p>
          </section>
        )}

        <section className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-xl">Recipes</h2>
            <Badge variant="outline" className="rounded-full">{recipes.length}</Badge>
          </div>
          {recipes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No recipes yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {recipes.map((r) => (
                <Link
                  key={r.id}
                  to={`/recipe/${r.id}`}
                  className="group relative aspect-[3/4] rounded-2xl overflow-hidden shadow-soft hover:shadow-card transition-shadow"
                >
                  <RecipeImg url={r.image_url} alt={r.title} />
                  <div className="absolute inset-0 gradient-card-overlay" />
                  <div className="absolute inset-x-0 bottom-0 p-3 text-primary-foreground">
                    <h3 className="font-display font-bold text-sm leading-tight line-clamp-2 drop-shadow">{r.title}</h3>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] font-semibold opacity-90">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{r.cooking_time_minutes}m</span>
                      <span className="flex items-center gap-1 capitalize"><ChefHat className="h-3 w-3" />{r.difficulty}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Creator;
