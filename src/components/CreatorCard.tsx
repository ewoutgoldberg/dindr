import { Link } from "react-router-dom";
import { Tables } from "@/integrations/supabase/types";
import { Instagram, Youtube, Globe, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Creator = Tables<"food_creators">;

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.16a8.16 8.16 0 0 0 4.77 1.52V6.23a4.85 4.85 0 0 1-1.84-.54Z" />
  </svg>
);

const NewBadge = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5">
    Nieuw op Dindr
  </span>
);

const showNewBadge = (c: Creator) => c.badge_new && c.status !== "claimed" && c.status !== "verified";

export const CreatorCard = ({ creator, variant = "full" }: { creator: Creator; variant?: "full" | "compact" }) => {
  if (variant === "compact") {
    return (
      <Link
        to={`/creator/${creator.id}`}
        className="flex items-center gap-3 bg-card rounded-2xl p-3 shadow-soft hover:shadow-card transition-shadow"
      >
        <img
          src={creator.avatar_url ?? ""}
          alt={creator.name}
          loading="lazy"
          className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/20"
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Recipe by</p>
          <div className="flex items-center gap-2">
            <p className="font-display font-bold truncate">{creator.name}</p>
            {showNewBadge(creator) && <NewBadge />}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>
    );
  }

  return (
    <Link
      to={`/creator/${creator.id}`}
      className="block bg-card rounded-3xl p-5 shadow-card hover:shadow-glow transition-shadow"
    >
      <div className="flex items-center gap-4">
        {creator.avatar_url ? (
          <img
            src={creator.avatar_url}
            alt={creator.name}
            loading="lazy"
            className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/30"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="h-16 w-16 rounded-full ring-2 ring-primary/30 gradient-primary grid place-items-center text-primary-foreground font-display font-bold text-xl">
            {creator.name?.charAt(0).toUpperCase() ?? "?"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">Created by</p>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-extrabold text-lg leading-tight truncate">{creator.name}</h3>
            {showNewBadge(creator) && <NewBadge />}
          </div>
          {creator.specialty && <p className="text-xs text-muted-foreground truncate">{creator.specialty}</p>}
        </div>
      </div>
      {creator.bio && <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{creator.bio}</p>}
      <div className="flex items-center justify-between mt-4">
        <SocialIcons creator={creator} />
        <span className="text-sm font-semibold text-primary flex items-center gap-1">
          View profile <ChevronRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
};

export const SocialIcons = ({ creator, size = "sm" }: { creator: Creator; size?: "sm" | "lg" }) => {
  const cls = cn(
    "rounded-full grid place-items-center transition-colors",
    size === "sm"
      ? "h-8 w-8 bg-muted hover:bg-primary/10 text-foreground"
      : "h-11 w-11 bg-card text-foreground hover:bg-primary hover:text-primary-foreground shadow-soft"
  );
  const icon = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <div className="flex gap-2">
      {creator.instagram_url && (
        <a href={creator.instagram_url} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className={cls} onClick={(e) => e.stopPropagation()}>
          <Instagram className={icon} />
        </a>
      )}
      {creator.tiktok_url && (
        <a href={creator.tiktok_url} target="_blank" rel="noopener noreferrer" aria-label="TikTok" className={cls} onClick={(e) => e.stopPropagation()}>
          <TikTokIcon className={icon} />
        </a>
      )}
      {creator.youtube_url && (
        <a href={creator.youtube_url} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className={cls} onClick={(e) => e.stopPropagation()}>
          <Youtube className={icon} />
        </a>
      )}
      {creator.website_url && (
        <a href={creator.website_url} target="_blank" rel="noopener noreferrer" aria-label="Website" className={cls} onClick={(e) => e.stopPropagation()}>
          <Globe className={icon} />
        </a>
      )}
    </div>
  );
};
