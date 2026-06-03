import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Creator = Tables<"food_creators">;
type Recipe = Tables<"recipes">;

const Claim = () => {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data: c } = await supabase.from("food_creators").select("*").eq("claim_token", token).maybeSingle();
      setCreator(c);
      if (c) {
        const { data: r } = await supabase.from("recipes").select("*").eq("creator_id", c.id);
        setRecipes(r ?? []);
      }
      setLoading(false);
    })();
  }, [token]);

  const claim = async () => {
    if (!user) {
      navigate(`/auth?redirect=/claim/${token}`);
      return;
    }
    setClaiming(true);
    const { error } = await supabase.rpc("claim_creator", { _token: token! });
    setClaiming(false);
    if (error) return toast.error(error.message);
    toast.success("Profile claimed!");
    navigate("/creator/dashboard");
  };

  if (loading || authLoading) return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!creator) return <div className="min-h-screen grid place-items-center text-muted-foreground">Invalid claim link</div>;

  const alreadyClaimed = !!creator.user_id && creator.user_id !== user?.id;

  return (
    <div className="max-w-md mx-auto w-full px-5 py-8 animate-fade-in pb-24">
      <div className="text-center mb-6">
        <Sparkles className="h-8 w-8 text-primary mx-auto mb-2" />
        <h1 className="font-display font-extrabold text-2xl">Welcome to Dindr</h1>
        <p className="text-sm text-muted-foreground mt-1">
          We've prepared a profile and recipes for you. Claim your account to take it over.
        </p>
      </div>

      <div className="bg-card rounded-3xl p-5 shadow-card text-center mb-5">
        <img src={creator.avatar_url ?? ""} alt={creator.name} className="h-24 w-24 rounded-full object-cover mx-auto ring-4 ring-background shadow-glow" />
        <h2 className="font-display font-extrabold text-xl mt-3">{creator.name}</h2>
        <p className="text-sm text-primary">@{creator.handle}</p>
        {creator.bio && <p className="text-sm text-muted-foreground italic mt-2">"{creator.bio}"</p>}
        <Badge variant="secondary" className="mt-3">{recipes.length} recipes ready</Badge>
      </div>

      {alreadyClaimed ? (
        <p className="text-center text-sm text-destructive">This profile is already claimed.</p>
      ) : creator.user_id === user?.id ? (
        <Button variant="hero" className="w-full" onClick={() => navigate("/creator/dashboard")}>Open dashboard</Button>
      ) : (
        <Button variant="hero" className="w-full" onClick={claim} disabled={claiming}>
          {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : user ? "Claim this profile" : "Sign in to claim"}
        </Button>
      )}
    </div>
  );
};

export default Claim;
