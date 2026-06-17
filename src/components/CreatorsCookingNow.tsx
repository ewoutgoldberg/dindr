import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Instagram, Music2 } from "lucide-react";

type Item = {
  id: string;
  platform: "instagram" | "tiktok";
  thumbnail_url: string | null;
  media_url: string | null;
  post_url: string | null;
  posted_at: string | null;
  recipe_id: string | null;
  food_creators: { id: string; name: string; handle: string; avatar_url: string | null } | null;
};

export const CreatorsCookingNow = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("social_posts")
        .select(
          "id, platform, thumbnail_url, media_url, post_url, posted_at, recipe_id, food_creators(id, name, handle, avatar_url)",
        )
        .order("posted_at", { ascending: false, nullsFirst: false })
        .limit(10);
      setItems((data as any) ?? []);
    })();
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="px-1 mb-2">
        <h2 className="font-display font-bold text-lg leading-tight">
          {t("inspiration.cookingNow")}
        </h2>
        <p className="text-xs text-muted-foreground">{t("inspiration.cookingNowSub")}</p>
      </div>
      <div className="-mx-5 px-5 overflow-x-auto overscroll-x-contain">
        <div className="flex gap-3 pb-2">
          {items.map((p) => {
            const PlatformIcon = p.platform === "instagram" ? Instagram : Music2;
            const target = p.recipe_id
              ? `/recipe/${p.recipe_id}`
              : p.food_creators
              ? `/creator/${p.food_creators.id}`
              : "#";
            return (
              <Link
                key={p.id}
                to={target}
                className="relative shrink-0 w-32 aspect-[3/4] rounded-2xl overflow-hidden shadow-soft bg-muted"
              >
                <img
                  src={p.thumbnail_url ?? p.media_url ?? ""}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <span className="absolute top-2 right-2 h-6 w-6 grid place-items-center rounded-full bg-background/90 text-foreground">
                  <PlatformIcon className="h-3.5 w-3.5" />
                </span>
                {p.food_creators && (
                  <div className="absolute inset-x-0 bottom-0 p-2 text-primary-foreground">
                    <div className="flex items-center gap-1.5">
                      {p.food_creators.avatar_url && (
                        <img
                          src={p.food_creators.avatar_url}
                          alt=""
                          className="h-5 w-5 rounded-full object-cover ring-1 ring-background/50"
                        />
                      )}
                      <span className="text-[11px] font-semibold truncate drop-shadow">
                        @{p.food_creators.handle}
                      </span>
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};
