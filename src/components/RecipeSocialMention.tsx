import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Instagram, Music2, ExternalLink } from "lucide-react";

type Mention = {
  id: string;
  platform: "instagram" | "tiktok";
  thumbnail_url: string | null;
  media_url: string | null;
  post_url: string | null;
  caption: string | null;
  posted_at: string | null;
  food_creators: { id: string; name: string; handle: string; avatar_url: string | null } | null;
};

export const RecipeSocialMention = ({ recipeId }: { recipeId: string }) => {
  const { t } = useTranslation();
  const [post, setPost] = useState<Mention | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("social_posts")
        .select(
          "id, platform, thumbnail_url, media_url, post_url, caption, posted_at, food_creators(id, name, handle, avatar_url)",
        )
        .eq("recipe_id", recipeId)
        .order("posted_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (alive) setPost((data as any) ?? null);
    })();
    return () => {
      alive = false;
    };
  }, [recipeId]);

  if (!post || !post.food_creators) return null;
  const platformLabel = post.platform === "instagram" ? "Instagram" : "TikTok";
  const PlatformIcon = post.platform === "instagram" ? Instagram : Music2;

  return (
    <section className="mt-6">
      <a
        href={post.post_url ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 bg-card rounded-2xl p-3 shadow-soft hover:shadow-card transition-shadow"
      >
        <div className="relative h-16 w-16 rounded-xl overflow-hidden bg-muted shrink-0">
          <img
            src={post.thumbnail_url ?? post.media_url ?? ""}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <span className="absolute bottom-1 right-1 h-5 w-5 grid place-items-center rounded-full bg-background/90 text-foreground shadow">
            <PlatformIcon className="h-3 w-3" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">
            {t("inspiration.seenAt", { handle: post.food_creators.handle, platform: platformLabel })}
          </p>
          <p className="text-sm font-semibold truncate">
            <Link
              to={`/creator/${post.food_creators.id}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:text-primary"
            >
              {post.food_creators.name}
            </Link>
          </p>
          {post.caption && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{post.caption}</p>
          )}
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
      </a>
    </section>
  );
};
