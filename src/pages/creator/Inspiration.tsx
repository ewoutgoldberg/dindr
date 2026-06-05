import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";
import { SocialAccountsManager } from "@/components/SocialAccountsManager";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, Instagram, Music2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

type Post = Tables<"social_posts">;

const Inspiration = () => {
  const { user } = useAuth();
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
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
      const { data } = await supabase
        .from("social_posts")
        .select("*")
        .eq("creator_id", c.id)
        .order("posted_at", { ascending: false, nullsFirst: false });
      setPosts((data ?? []) as Post[]);
      setLoading(false);
    })();
  }, [user]);

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
      <div className="mb-5">
        <h1 className="font-display font-extrabold text-2xl">Inspiratie</h1>
        <p className="text-xs text-muted-foreground">Je gekoppelde Instagram & TikTok-feed</p>
      </div>

      <div className="mb-6">
        <SocialAccountsManager creatorId={creatorId} />
      </div>

      <h2 className="font-display font-bold mb-3">Recente posts</h2>
      {posts.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 text-center shadow-soft">
          <p className="text-sm text-muted-foreground">
            Nog geen posts. Koppel een account hierboven en we synchroniseren je content automatisch.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {posts.map((p) => {
            const isVideo = p.media_type === "video" || p.media_url?.includes(".mp4");
            return (
              <a
                key={p.id}
                href={p.post_url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-card rounded-2xl overflow-hidden shadow-soft group"
              >
                <div className="aspect-square bg-muted relative">
                  {p.thumbnail_url || p.media_url ? (
                    isVideo && p.media_url && !p.thumbnail_url ? (
                      <video src={p.media_url} className="w-full h-full object-cover" muted playsInline />
                    ) : (
                      <img
                        src={p.thumbnail_url ?? p.media_url ?? ""}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    )
                  ) : null}
                  <Badge
                    className={`absolute top-2 left-2 text-[10px] gap-1 ${
                      p.platform === "tiktok" ? "bg-foreground text-background" : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {p.platform === "tiktok" ? <Music2 className="h-3 w-3" /> : <Instagram className="h-3 w-3" />}
                    {p.platform}
                  </Badge>
                  {p.post_url && (
                    <div className="absolute top-2 right-2 bg-background/80 backdrop-blur rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink className="h-3 w-3" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  {p.caption && <p className="text-xs line-clamp-2 mb-1">{p.caption}</p>}
                  {p.posted_at && (
                    <p className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(p.posted_at), { addSuffix: true, locale: nl })}
                    </p>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Inspiration;
