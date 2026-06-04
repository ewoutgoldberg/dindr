import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Instagram, Music2, ExternalLink, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Post = {
  id: string;
  platform: "instagram" | "tiktok";
  media_type: "image" | "video" | "carousel";
  media_url: string | null;
  thumbnail_url: string | null;
  caption: string | null;
  post_url: string | null;
  posted_at: string | null;
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
  const [open, setOpen] = useState(false);
  const isLong = text.length > 110;
  return (
    <p className="text-xs text-foreground/90 whitespace-pre-wrap">
      {open || !isLong ? text : text.slice(0, 110) + "…"}
      {isLong && (
        <button onClick={() => setOpen((v) => !v)} className="ml-1 text-primary font-semibold">
          {open ? "minder" : "lees meer"}
        </button>
      )}
    </p>
  );
};

const PlatformBadge = ({ p }: { p: "instagram" | "tiktok" }) => (
  <Badge variant="secondary" className="rounded-full text-[10px] gap-1">
    {p === "instagram" ? <Instagram className="h-3 w-3" /> : <Music2 className="h-3 w-3" />}
    Van {p === "instagram" ? "Instagram" : "TikTok"}
  </Badge>
);

export const InspirationFeed = ({ creatorId }: { creatorId: string }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("social_posts")
        .select("id, platform, media_type, media_url, thumbnail_url, caption, post_url, posted_at")
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
      <p className="text-sm text-muted-foreground text-center py-8">
        Nog geen inspiratie posts. Deze creator heeft nog geen social accounts gekoppeld.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((p) => (
        <article key={p.id} className="bg-card rounded-3xl overflow-hidden shadow-soft">
          <div className="flex items-center justify-between p-3">
            <PlatformBadge p={p.platform} />
            {p.posted_at && (
              <span className="text-[10px] text-muted-foreground">
                {new Date(p.posted_at).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className={`relative bg-muted ${p.media_type === "video" ? "aspect-[9/16]" : "aspect-square"} max-h-[70vh]`}>
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
          <div className="p-3 space-y-2">
            {p.caption && <Caption text={p.caption} />}
            {p.post_url && (
              <a
                href={p.post_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary inline-flex items-center gap-1 font-semibold"
              >
                Bekijk op {p.platform === "instagram" ? "Instagram" : "TikTok"}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </article>
      ))}
    </div>
  );
};
