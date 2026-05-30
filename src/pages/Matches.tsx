import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown, Heart, Loader2, Sparkles, User as UserIcon, Users } from "lucide-react";
import { fmtDayLong } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { NotifyPartnerButton } from "@/components/NotifyPartnerButton";

type Recipe = Tables<"recipes">;
type Group = {
  date: string;
  mine: Recipe[];
  partner: Recipe[];
  mutual: Recipe[];
  finalId: string | null;
};

const PLACEHOLDER = "/placeholder.svg";

const Matches = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPartner, setHasPartner] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      const { data: partnership } = await supabase
        .from("partnerships")
        .select("user_a, user_b")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .maybeSingle();
      const partnerId = partnership ? (partnership.user_a === user.id ? partnership.user_b : partnership.user_a) : null;
      setHasPartner(!!partnerId);

      const userIds = partnerId ? [user.id, partnerId] : [user.id];
      const { data: swipes } = await supabase
        .from("swipes")
        .select("user_id, plan_date, liked, recipe_id, recipes(*)")
        .in("user_id", userIds)
        .eq("liked", true)
        .order("plan_date", { ascending: true });

      const { data: plans } = await supabase
        .from("meal_plans")
        .select("plan_date, final_recipe_id")
        .eq("user_id", user.id);
      const finalMap = new Map(plans?.map((p) => [p.plan_date, p.final_recipe_id]));

      const map = new Map<string, Group>();
      swipes?.forEach((s) => {
        const recipe = s.recipes as Recipe;
        if (!recipe) return;
        if (!map.has(s.plan_date))
          map.set(s.plan_date, {
            date: s.plan_date,
            mine: [],
            partner: [],
            mutual: [],
            finalId: finalMap.get(s.plan_date) ?? null,
          });
        const g = map.get(s.plan_date)!;
        if (s.user_id === user.id) {
          if (!g.mine.some((r) => r.id === recipe.id)) g.mine.push(recipe);
        } else {
          if (!g.partner.some((r) => r.id === recipe.id)) g.partner.push(recipe);
        }
      });
      map.forEach((g) => {
        const partnerIds = new Set(g.partner.map((r) => r.id));
        g.mutual = g.mine.filter((r) => partnerIds.has(r.id));
      });
      setGroups(Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date)));
      setLoading(false);
    };
    load();
  }, [user]);

  const setFinal = async (date: string, recipeId: string) => {
    if (!user) return;
    await supabase
      .from("meal_plans")
      .upsert({ user_id: user.id, plan_date: date, final_recipe_id: recipeId }, { onConflict: "user_id,plan_date" });
    toast.success("Decision saved!");
    setGroups((prev) => prev.map((g) => (g.date === date ? { ...g, finalId: recipeId } : g)));
  };

  const handleImgErr = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (e.currentTarget.src.endsWith(PLACEHOLDER)) return;
    e.currentTarget.src = PLACEHOLDER;
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const RecipeTile = ({
    recipe,
    date,
    tone,
    isFinal,
  }: {
    recipe: Recipe;
    date: string;
    tone: "mine" | "partner" | "match";
    isFinal?: boolean;
  }) => (
    <button
      onClick={() => navigate(`/recipe/${recipe.id}?date=${date}`)}
      className={cn(
        "text-left rounded-2xl overflow-hidden bg-card shadow-soft active:scale-[0.98] transition-transform relative w-full",
        tone === "match" && "ring-2 ring-accent",
        isFinal && "ring-2 ring-success",
      )}
    >
      <div className="aspect-square relative">
        <img
          src={recipe.image_url ?? PLACEHOLDER}
          alt={recipe.title}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          onError={handleImgErr}
        />
        {isFinal && (
          <span className="absolute top-2 right-2 bg-success text-success-foreground text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full flex items-center gap-1">
            <Check className="h-3 w-3" /> Picked
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="font-display font-bold text-sm leading-tight line-clamp-2">{recipe.title}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {recipe.cooking_time_minutes} min · {recipe.category}
        </p>
        {tone !== "partner" && (
          <Button
            variant={isFinal ? "secondary" : "outline"}
            size="sm"
            className="w-full mt-2 h-8 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              setFinal(date, recipe.id);
            }}
          >
            {isFinal ? "Final pick ✓" : "Make it final"}
          </Button>
        )}
      </div>
    </button>
  );

  const SectionHeader = ({
    icon,
    label,
    count,
    tint,
  }: {
    icon: React.ReactNode;
    label: string;
    count: number;
    tint: string;
  }) => (
    <div className="flex items-center gap-2 mb-2 mt-4">
      <span className={cn("inline-flex items-center justify-center h-6 w-6 rounded-full", tint)}>{icon}</span>
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">{label}</h3>
      <span className="text-[11px] text-muted-foreground">({count})</span>
    </div>
  );

  return (
    <div className="max-w-md mx-auto w-full px-5 pt-6 animate-fade-in">
      <header className="mb-6">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider">Suggestions & matches</p>
        <h1 className="text-3xl font-display font-extrabold mt-1">Matches</h1>
        <p className="text-muted-foreground mt-1">
          {hasPartner
            ? "It's only a real match when you both pick the same recipe."
            : "Connect a partner in your profile to turn picks into matches."}
        </p>
      </header>

      <CollapsibleGroups
        groups={groups}
        hasPartner={hasPartner}
        navigate={navigate}
        handleImgErr={handleImgErr}
        RecipeTile={RecipeTile}
        SectionHeader={SectionHeader}
      />
    </div>
  );
};

type CollapsibleGroupsProps = {
  groups: Group[];
  hasPartner: boolean;
  navigate: ReturnType<typeof useNavigate>;
  handleImgErr: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  RecipeTile: React.FC<{ recipe: Recipe; date: string; tone: "mine" | "partner" | "match"; isFinal?: boolean }>;
  SectionHeader: React.FC<{ icon: React.ReactNode; label: string; count: number; tint: string }>;
};

const CollapsibleGroups = ({
  groups,
  hasPartner,
  navigate,
  handleImgErr,
  RecipeTile,
  SectionHeader,
}: CollapsibleGroupsProps) => {
  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const [openDates, setOpenDates] = useState<Set<string>>(() => new Set([today]));

  const toggle = (date: string) =>
    setOpenDates((prev) => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });

  const displayGroups = useMemo(() => {
    if (groups.some((g) => g.date === today)) return groups;
    const todayGroup: Group = { date: today, mine: [], partner: [], mutual: [], finalId: null };
    return [todayGroup, ...groups].sort((a, b) => b.date.localeCompare(a.date));
  }, [groups, today]);

  return (
    <>
      {displayGroups.map((g) => {
        const isOpen = openDates.has(g.date);
        const isToday = g.date === today;
        const finalRecipe =
          g.finalId && (g.mine.find((r) => r.id === g.finalId) || g.partner.find((r) => r.id === g.finalId));
        const mineOnly = g.mine.filter((r) => !g.mutual.some((m) => m.id === r.id) && r.id !== g.finalId);
        const partnerOnly = g.partner.filter(
          (r) => !g.mutual.some((m) => m.id === r.id) && !g.mine.some((m) => m.id === r.id) && r.id !== g.finalId,
        );
        const matchesToShow = g.mutual.filter((r) => r.id !== g.finalId);
        const totalItems = (finalRecipe ? 1 : 0) + matchesToShow.length + mineOnly.length + partnerOnly.length;

        return (
          <section key={g.date} className={cn("mb-4 rounded-2xl border border-border bg-card overflow-hidden", isOpen && "shadow-soft")}>
            <button
              onClick={() => toggle(g.date)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left active:scale-[0.997] transition-transform"
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="font-display font-bold text-base truncate">{fmtDayLong(parseISO(g.date))}</h2>
                {isToday && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    Today
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {g.mutual.length > 0 ? (
                  <Badge className="bg-accent text-accent-foreground">
                    <Sparkles className="h-3 w-3 mr-1" />
                    {g.mutual.length}
                  </Badge>
                ) : hasPartner ? (
                  <Badge variant="outline" className="text-muted-foreground text-[10px]">
                    {totalItems} pick{totalItems === 1 ? "" : "s"}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground text-[10px]">
                    {totalItems}
                  </Badge>
                )}
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
              </div>
            </button>

            {isOpen && (
              <div className="px-4 pb-4">
                {totalItems === 0 && (
                  <div className="text-center py-6 px-4 rounded-xl bg-muted/40 border border-dashed border-border">
                    <div className="h-12 w-12 rounded-full bg-background grid place-items-center mx-auto mb-3">
                      <Heart className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="font-display font-bold text-sm">No picks yet for this day</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-4">
                      {hasPartner
                        ? "Start swiping to create a match with your partner."
                        : "Start swiping to build your shortlist."}
                    </p>
                    <Button variant="hero" size="sm" onClick={() => navigate(`/swipe?date=${g.date}`)}>
                      <Sparkles className="h-3.5 w-3.5" /> Start swiping
                    </Button>
                  </div>
                )}
                {/* FINAL PICK — hero */}
                {finalRecipe && (
                  <div className="mb-2">
                    <SectionHeader
                      icon={<Check className="h-3.5 w-3.5 text-success-foreground" />}
                      label="Final pick"
                      count={1}
                      tint="bg-success"
                    />
                    <button
                      onClick={() => navigate(`/recipe/${finalRecipe.id}?date=${g.date}`)}
                      className="w-full text-left rounded-2xl overflow-hidden bg-card shadow-soft ring-2 ring-success active:scale-[0.99] transition-transform relative"
                    >
                      <div className="aspect-[16/9] relative">
                        <img
                          src={finalRecipe.image_url ?? PLACEHOLDER}
                          alt={finalRecipe.title}
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={handleImgErr}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                        <span className="absolute top-3 left-3 bg-success text-success-foreground text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full flex items-center gap-1">
                          <Check className="h-3 w-3" /> Final pick
                        </span>
                        <div className="absolute bottom-3 left-3 right-3 text-white">
                          <p className="font-display font-extrabold text-lg leading-tight">{finalRecipe.title}</p>
                          <p className="text-xs opacity-90 mt-0.5">
                            {finalRecipe.cooking_time_minutes} min · {finalRecipe.category}
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                )}

                {hasPartner && (
                  <div className="flex justify-end mt-3">
                    <NotifyPartnerButton
                      planDate={g.date}
                      variant="ghost"
                      size="sm"
                      label="Ping partner"
                      className="h-7 px-2 text-xs"
                    />
                  </div>
                )}

                {matchesToShow.length > 0 && (
                  <>
                    <SectionHeader
                      icon={<Sparkles className="h-3.5 w-3.5 text-accent-foreground" />}
                      label="Matches"
                      count={matchesToShow.length}
                      tint="bg-accent"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      {matchesToShow.map((r) => (
                        <RecipeTile key={r.id} recipe={r} date={g.date} tone="match" />
                      ))}
                    </div>
                  </>
                )}

                {mineOnly.length > 0 && (
                  <>
                    <SectionHeader
                      icon={<UserIcon className="h-3.5 w-3.5 text-primary-foreground" />}
                      label="Your suggestions"
                      count={mineOnly.length}
                      tint="bg-primary"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      {mineOnly.map((r) => (
                        <RecipeTile key={r.id} recipe={r} date={g.date} tone="mine" />
                      ))}
                    </div>
                  </>
                )}

                {hasPartner && partnerOnly.length > 0 && (
                  <>
                    <SectionHeader
                      icon={<Users className="h-3.5 w-3.5 text-secondary-foreground" />}
                      label="Partner's suggestions"
                      count={partnerOnly.length}
                      tint="bg-secondary"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      {partnerOnly.map((r) => (
                        <RecipeTile key={r.id} recipe={r} date={g.date} tone="partner" />
                      ))}
                    </div>
                  </>
                )}

                {hasPartner && matchesToShow.length === 0 && !finalRecipe && (
                  <p className="text-xs text-muted-foreground mt-3 italic">
                    Keep swiping — a match happens when you both like the same recipe.
                  </p>
                )}
              </div>
            )}
          </section>
        );
      })}
    </>
  );
};

export default Matches;
