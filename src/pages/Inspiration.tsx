import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Instagram, Music2, ExternalLink, Loader2, ChefHat, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ReelVideo = ({ src, poster, alt }: { src: string; poster?: string; alt: string }) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) v.play().catch(() => {});
          else v.pause();
        });
      },
      { threshold: 0.5 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      aria-label={alt}
      muted
      loop
      playsInline
      preload="metadata"
      className="w-full h-full object-cover"
    />
  );
};


type Post = {
  id: string;
  platform: "instagram" | "tiktok";
  media_type: "image" | "video" | "carousel";
  media_url: string | null;
  thumbnail_url: string | null;
  caption: string | null;
  post_url: string | null;
  posted_at: string | null;
  recipe_id: string | null;
  food_creators: { id: string; name: string; handle: string; avatar_url: string | null } | null;
  recipes: { id: string; title: string } | null;
};

const Inspiration = () => {
  const { t } = useTranslation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("social_posts")
        .select(
          "id, platform, media_type, media_url, thumbnail_url, caption, post_url, posted_at, recipe_id, food_creators(id, name, handle, avatar_url), recipes(id, title)",
        )
        .order("posted_at", { ascending: false, nullsFirst: false })
        .limit(60);
      setPosts((data as any) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="max-w-md mx-auto w-full px-5 pt-6 pb-28 animate-fade-in">
      <header className="mb-5">
        <h1 className="font-display font-extrabold text-2xl leading-tight">
          {t("inspiration.pageTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("inspiration.pageSub")}</p>
      </header>

      {loading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : posts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          {t("inspiration.empty")}
        </p>
      ) : (
        <div className="space-y-4">
          {posts.map((p) => {
            const PlatformIcon = p.platform === "instagram" ? Instagram : Music2;
            const platformLabel = p.platform === "instagram" ? "Instagram" : "TikTok";
            return (
              <article key={p.id} className="bg-card rounded-3xl overflow-hidden shadow-soft">
                <div className="flex items-center gap-3 p-3">
                  {p.food_creators && (
                    <Link
                      to={`/creator/${p.food_creators.id}`}
                      className="flex items-center gap-2.5 flex-1 min-w-0"
                    >
                      {p.food_creators.avatar_url ? (
                        <img
                          src={p.food_creators.avatar_url}
                          alt={p.food_creators.name}
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-full gradient-warm grid place-items-center text-primary-foreground text-sm font-bold">
                          {p.food_creators.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{p.food_creators.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          @{p.food_creators.handle}
                        </p>
                      </div>
                    </Link>
                  )}
                  <Badge variant="secondary" className="rounded-full text-[10px] gap-1 shrink-0">
                    <PlatformIcon className="h-3 w-3" />
                    {platformLabel}
                  </Badge>
                </div>

                <div className="relative bg-muted aspect-square max-h-[70vh]">
                  <img
                    src={p.thumbnail_url ?? p.media_url ?? ""}
                    alt={p.caption?.slice(0, 80) ?? "Social post"}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="p-3 space-y-3">
                  {p.caption && (
                    <p className="text-xs text-foreground/90 whitespace-pre-wrap line-clamp-3">
                      {p.caption}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    {p.posted_at && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(p.posted_at).toLocaleDateString()}
                      </span>
                    )}
                    <div className="flex items-center gap-2 ml-auto">
                      {p.post_url && (
                        <a
                          href={p.post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary inline-flex items-center gap-1 font-semibold"
                        >
                          {t("inspiration.viewOn", { platform: platformLabel })}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {p.recipes && (
                        <Button asChild size="sm" variant="secondary" className="rounded-full h-8 text-xs">
                          <Link to={`/recipe/${p.recipes.id}`}>
                            <ChefHat className="h-3.5 w-3.5 mr-1" />
                            {t("inspiration.viewRecipe")}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Inspiration;
