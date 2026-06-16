import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, PanInfo, useMotionValue, animate } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  SlidersHorizontal,
  Flame,
  Heart,
  CalendarDays,
  User,
  Clock,
  Users,
  X,
  Check,
  Calendar as CalendarIcon,
  ShoppingBasket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fmtDateKey } from "@/lib/dates";

/* ---------- Phone frame & shared bottom-nav mock ---------- */

const PhoneFrame = ({ children }: { children: React.ReactNode }) => (
  <div className="relative mx-auto h-full aspect-[9/19] max-h-full rounded-[2.2rem] bg-foreground/90 p-[6px] shadow-card">
    <div className="relative h-full w-full overflow-hidden rounded-[1.9rem] bg-background">
      {/* Notch */}
      <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-30 h-4 w-16 rounded-full bg-foreground/90" />
      {children}
    </div>
  </div>
);

const BottomNavMock = ({ active }: { active: "filters" | "swipe" | "matches" | "plan" | "myKitchen" }) => {
  const items: Array<{ key: typeof active; label: string; Icon: typeof Flame }> = [
    { key: "filters", label: "Filters", Icon: SlidersHorizontal },
    { key: "swipe", label: "Swipe", Icon: Flame },
    { key: "matches", label: "Matches", Icon: Heart },
    { key: "plan", label: "Weekplan", Icon: CalendarDays },
    { key: "myKitchen", label: "MijnKeuken", Icon: User },
  ];
  return (
    <div className="absolute bottom-0 inset-x-0 z-20 bg-background/95 backdrop-blur border-t border-border">
      <div className="grid grid-cols-5 px-1 py-1.5">
        {items.map(({ key, label, Icon }) => {
          const isActive = key === active;
          return (
            <div key={key} className="flex flex-col items-center gap-0.5">
              <Icon
                className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")}
                strokeWidth={isActive ? 2.6 : 2}
              />
              <span
                className={cn(
                  "text-[7px] font-bold uppercase tracking-wide leading-none",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ---------- Per-slide phone screens ---------- */

const RecipePhotoBlock = ({ hue, label }: { hue: number; label: string }) => (
  <div
    className="relative w-full h-full grid place-items-center text-white/90 text-[10px] font-semibold"
    style={{
      backgroundImage: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${hue + 25} 75% 40%))`,
    }}
  >
    <span className="opacity-80">{label}</span>
  </div>
);

const WelcomeScreen = () => (
  <PhoneFrame>
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center bg-gradient-to-b from-primary/10 via-background to-background">
      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-accent grid place-items-center shadow-card mb-3">
        <Flame className="h-9 w-9 text-primary-foreground" strokeWidth={2.6} />
      </div>
      <div className="font-display font-extrabold text-2xl tracking-tight">Dinder</div>
      <div className="text-[11px] text-muted-foreground mt-1">Tinder for dinner</div>
      <div className="mt-4 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
        Samen beslissen wat je eet
      </div>
    </div>
    <BottomNavMock active="swipe" />
  </PhoneFrame>
);

const SwipeScreen = () => (
  <PhoneFrame>
    <div className="absolute inset-0 pt-7 pb-12 px-3 bg-background">
      {/* Swiping for pill */}
      <div className="absolute top-9 left-3 z-10 flex items-center gap-1.5 bg-foreground/70 text-primary-foreground rounded-full pl-2 pr-3 py-1">
        <CalendarIcon className="h-3 w-3" />
        <div className="leading-tight">
          <p className="text-[6px] font-bold uppercase tracking-wider opacity-90">Aan het swipen voor</p>
          <p className="text-[9px] font-display font-bold">Vanavond</p>
        </div>
      </div>
      {/* Stack */}
      <div className="relative h-full w-full">
        <div className="absolute inset-x-2 top-2 bottom-2 rounded-2xl bg-muted scale-95 opacity-60" />
        <div className="absolute inset-0 rounded-2xl overflow-hidden shadow-card">
          <RecipePhotoBlock hue={18} label="Pasta al limone" />
          <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/80 to-transparent text-white">
            <div className="font-display font-bold text-[13px] leading-tight">Pasta al limone</div>
            <div className="flex items-center gap-2 text-[9px] opacity-90 mt-0.5">
              <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />30 min</span>
              <span>·</span>
              <span className="flex items-center gap-0.5"><Users className="h-2.5 w-2.5" />2 pers.</span>
            </div>
          </div>
          {/* Swipe hint */}
          <div className="absolute top-3 right-3 rotate-12 border-2 border-emerald-400 text-emerald-400 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-white/10 backdrop-blur-sm">
            Lekker
          </div>
        </div>
      </div>
    </div>
    <BottomNavMock active="swipe" />
  </PhoneFrame>
);

const FiltersScreen = () => {
  const pills = [
    { label: "Italiaans", on: true },
    { label: "Aziatisch", on: false },
    { label: "Vegetarisch", on: true },
    { label: "Glutenvrij", on: false },
    { label: "Snel klaar", on: true },
  ];
  return (
    <PhoneFrame>
      <div className="absolute inset-0 pt-7 pb-12 px-3 bg-background overflow-hidden">
        <div className="font-display font-extrabold text-sm mb-2">Filters</div>
        <div className="text-[9px] text-muted-foreground mb-1.5">Keuken</div>
        <div className="flex flex-wrap gap-1 mb-3">
          {pills.slice(0, 2).map((p) => (
            <span
              key={p.label}
              className={cn(
                "px-2 py-0.5 rounded-full text-[9px] font-semibold border",
                p.on ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
              )}
            >
              {p.label}
            </span>
          ))}
        </div>
        <div className="text-[9px] text-muted-foreground mb-1.5">Dieet</div>
        <div className="flex flex-wrap gap-1 mb-3">
          {pills.slice(2, 4).map((p) => (
            <span
              key={p.label}
              className={cn(
                "px-2 py-0.5 rounded-full text-[9px] font-semibold border",
                p.on ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
              )}
            >
              {p.label}
            </span>
          ))}
        </div>
        <div className="text-[9px] text-muted-foreground mb-1.5">Kooktijd</div>
        <div className="h-1 rounded-full bg-muted relative mb-1">
          <div className="absolute left-0 top-0 h-1 w-2/3 rounded-full bg-primary" />
          <div className="absolute left-[66%] -top-1 h-3 w-3 rounded-full bg-primary shadow" />
        </div>
        <div className="flex justify-between text-[8px] text-muted-foreground">
          <span>10 min</span>
          <span>45 min</span>
        </div>
      </div>
      <BottomNavMock active="filters" />
    </PhoneFrame>
  );
};

const PartnerScreen = () => (
  <PhoneFrame>
    <div className="absolute inset-0 pt-7 pb-12 px-3 bg-background flex flex-col">
      <div className="font-display font-extrabold text-sm mb-3">Koppel met je partner</div>
      <div className="rounded-xl border border-border p-3 text-center mb-3">
        <div className="text-[9px] text-muted-foreground mb-1">Jouw code</div>
        <div className="font-display font-extrabold text-2xl tracking-[0.25em] text-primary">428193</div>
      </div>
      <div className="text-[9px] text-muted-foreground mb-1">Of vul de code van je partner in</div>
      <div className="flex gap-1 mb-3">
        {["7", "2", "9", "0", "4", "5"].map((d, idx) => (
          <div
            key={idx}
            className="flex-1 h-8 rounded-md border border-border grid place-items-center font-display font-bold text-sm bg-muted/40"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="mt-auto flex items-center justify-center gap-2 py-2">
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-accent" />
        <Heart className="h-4 w-4 text-primary fill-primary" />
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-accent to-primary" />
      </div>
    </div>
    <BottomNavMock active="myKitchen" />
  </PhoneFrame>
);

const PlanScreen = () => {
  const days = ["Ma", "Di", "Wo", "Do", "Vr"];
  return (
    <PhoneFrame>
      <div className="absolute inset-0 pt-7 pb-12 px-3 bg-background">
        <div className="flex items-center justify-between mb-2">
          <div className="font-display font-extrabold text-sm">Weekplan</div>
          <ShoppingBasket className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex gap-1 mb-3">
          {days.map((d, i) => (
            <div
              key={d}
              className={cn(
                "flex-1 py-1 rounded-md text-[9px] font-bold text-center",
                i === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              {d}
            </div>
          ))}
        </div>
        {[
          { hue: 18, name: "Pasta al limone", min: 30 },
          { hue: 140, name: "Thaise curry", min: 25 },
          { hue: 280, name: "Bietensalade", min: 20 },
        ].map((m) => (
          <div key={m.name} className="flex items-center gap-2 mb-1.5 rounded-lg border border-border p-1.5">
            <div className="h-9 w-9 rounded-md overflow-hidden shrink-0">
              <RecipePhotoBlock hue={m.hue} label="" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[11px] leading-tight truncate">{m.name}</div>
              <div className="flex items-center gap-1.5 text-[8px] text-muted-foreground mt-0.5">
                <span className="flex items-center gap-0.5"><Clock className="h-2 w-2" />{m.min} min</span>
                <span>·</span>
                <span className="flex items-center gap-0.5"><Users className="h-2 w-2" />2 pers.</span>
              </div>
            </div>
            <Check className="h-3 w-3 text-primary" />
          </div>
        ))}
      </div>
      <BottomNavMock active="plan" />
    </PhoneFrame>
  );
};

/* ---------- Page ---------- */

const Onboarding = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const replay = params.get("replay") === "1";

  const steps = useMemo(
    () => [
      { key: "welcome", Screen: WelcomeScreen },
      { key: "swipe", Screen: SwipeScreen },
      { key: "filters", Screen: FiltersScreen },
      { key: "partner", Screen: PartnerScreen },
      { key: "plan", Screen: PlanScreen },
    ],
    []
  );

  const [i, setI] = useState(0);
  const isLast = i === steps.length - 1;

  const trackRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const x = useMotionValue(0);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const update = () => setWidth(el.offsetWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!width) return;
    const controls = animate(x, -i * width, {
      type: "spring",
      stiffness: 320,
      damping: 36,
      mass: 0.9,
    });
    return controls.stop;
  }, [i, width, x]);

  const finish = useCallback(async () => {
    if (user && !replay) {
      await supabase.from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("id", user.id);
    }
    navigate(`/swipe/${fmtDateKey(new Date())}`, { replace: true });
  }, [user, replay, navigate]);

  const goTo = useCallback(
    (idx: number) => {
      const next = Math.max(0, Math.min(steps.length - 1, idx));
      setI(next);
    },
    [steps.length]
  );

  const next = useCallback(() => {
    if (isLast) return finish();
    goTo(i + 1);
  }, [isLast, finish, goTo, i]);

  const back = useCallback(() => goTo(i - 1), [i, goTo]);

  const handleDragEnd = useCallback(
    (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (!width) return;
      const threshold = width * 0.18;
      const velocity = info.velocity.x;
      const offset = info.offset.x;
      let target = i;
      if (offset < -threshold || velocity < -500) target = i + 1;
      else if (offset > threshold || velocity > 500) target = i - 1;
      goTo(target);
    },
    [width, i, goTo]
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background safe-top">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button
          type="button"
          onClick={back}
          disabled={i === 0}
          className={cn(
            "h-10 w-10 grid place-items-center rounded-full transition-opacity",
            i === 0 ? "opacity-0 pointer-events-none" : "opacity-100 hover:bg-muted"
          )}
          aria-label={t("onboarding.back")}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        {!isLast ? (
          <button
            type="button"
            onClick={finish}
            className="text-sm font-semibold text-muted-foreground hover:text-foreground px-3 py-2"
          >
            {t("onboarding.skip")}
          </button>
        ) : (
          <span className="w-10" />
        )}
      </div>

      {/* Carousel */}
      <div ref={trackRef} className="flex-1 min-h-0 overflow-hidden relative">
        <motion.div
          className="absolute inset-0 flex touch-pan-y"
          style={{ x, width: `${steps.length * 100}%` }}
          drag="x"
          dragConstraints={{ left: -(steps.length - 1) * width, right: 0 }}
          dragElastic={0.12}
          onDragEnd={handleDragEnd}
        >
          {steps.map(({ key, Screen }) => (
            <div
              key={key}
              className="h-full flex flex-col px-6 cursor-grab active:cursor-grabbing"
              style={{ width: `${100 / steps.length}%`, flexShrink: 0 }}
            >
              {/* Visual (~55%) */}
              <div className="basis-[55%] min-h-0 grid place-items-center py-2">
                <Screen />
              </div>
              {/* Text zone */}
              <div className="basis-[45%] max-w-md w-full mx-auto text-center pt-5 px-2 overflow-hidden">
                <h1 className="font-display font-extrabold text-2xl mb-2 leading-tight">
                  {t(`onboarding.${key}.title`)}
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(`onboarding.${key}.body`)}
                </p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Footer: dots + next */}
      <div className="shrink-0 px-6 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)] max-w-md w-full mx-auto">
        <div className="flex items-center justify-center gap-2 mb-4">
          {steps.map((s, idx) => (
            <button
              key={s.key}
              onClick={() => goTo(idx)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                idx === i ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
              )}
              aria-label={`${t("onboarding.back")} ${idx + 1}`}
            />
          ))}
        </div>
        <Button variant="hero" size="lg" className="w-full" onClick={next}>
          {isLast ? t("onboarding.start") : t("onboarding.next")}
        </Button>
      </div>
    </div>
  );
};

export default Onboarding;
