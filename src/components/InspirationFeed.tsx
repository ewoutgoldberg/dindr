import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Instagram, Music2, ExternalLink, Loader2, ChefHat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  recipes?: { id: string; title: string } | null;
};

const VideoCard = ({ post }: { post: Post }) => {
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
      { threshold: 0.6 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <video
      ref={ref}
      src={post.media_url ?? undefined}
      poster={post.thumbnail_url ?? undefined}
      muted
      loop
      playsInline
      className="w-full h-full object-cover"
    />
  );
};

const Caption = ({ text }: { text: string }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const isLong = text.length > 110;
  return (
    <p className="text-xs text-foreground/90 whitespace-pre-wrap">
      {open || !isLong ? text : text.slice(0, 110) + "…"}
      {isLong && (
        <button onClick={() => setOpen((v) => !v)} className="ml-1 text-primary font-semibold">
          {open ? t("inspiration.readLess") : t("inspiration.readMore")}
        </button>
      )}
    </p>
  );
};

const PlatformBadge = ({ p }: { p: "instagram" | "tiktok" }) => {
  const { t } = useTranslation();
  const label = p === "instagram" ? "Instagram" : "TikTok";
  return (
    <Badge variant="secondary" className="rounded-full text-[10px] gap-1">
      {p === "instagram" ? <Instagram className="h-3 w-3" /> : <Music2 className="h-3 w-3" />}
      {t("inspiration.from")} {label}
    </Badge>
  );
};

export const InspirationFeed = ({ creatorId }: { creatorId: string }) => {
  const { t } = useTranslation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("social_posts")
        .select(
          "id, platform, media_type, media_url, thumbnail_url, caption, post_url, posted_at, recipe_id, recipes(id, title)",
        )
        .eq("creator_id", creatorId)
        .order("posted_at", { ascending: false, nullsFirst: false })
        .limit(60);
      setPosts((data as any) ?? []);
      setLoading(false);
    })();
  }, [creatorId]);

  if (loading) {
    return (
      <div className="grid place-items-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">{t("inspiration.empty")}</p>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((p) => {
        const platformLabel = p.platform === "instagram" ? "Instagram" : "TikTok";
        return (
          <article key={p.id} className="bg-card rounded-3xl overflow-hidden shadow-soft">
            <div className="flex items-center justify-between p-3">
              <PlatformBadge p={p.platform} />
              {p.posted_at && (
                <span className="text-[10px] text-muted-foreground">
                  {new Date(p.posted_at).toLocaleDateString()}
                </span>
              )}
            </div>
            <div
              className={`relative bg-muted ${p.media_type === "video" ? "aspect-[9/16]" : "aspect-square"} max-h-[70vh]`}
            >
              {p.media_type === "video" && p.media_url ? (
                <VideoCard post={p} />
              ) : (
                <img
                  src={p.thumbnail_url ?? p.media_url ?? ""}
                  alt={p.caption?.slice(0, 80) ?? "Social post"}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="p-3 space-y-3">
              {p.caption && <Caption text={p.caption} />}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                {p.post_url ? (
                  <a
                    href={p.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary inline-flex items-center gap-1 font-semibold"
                  >
                    {t("inspiration.viewOn", { platform: platformLabel })}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span />
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
          </article>
        );
      })}
    </div>
  );
};
