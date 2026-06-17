import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, PanInfo, useMotionValue, useTransform, animate } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ChevronLeft, SlidersHorizontal, Flame, Heart, CalendarDays, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fmtDateKey } from "@/lib/dates";
import swipeShot from "@/assets/onboarding-swipe.png.asset.json";
import filtersShot from "@/assets/onboarding-filters.png.asset.json";
import matchesShot from "@/assets/onboarding-matches.png.asset.json";
import planShot from "@/assets/onboarding-plan.png.asset.json";
import dindrIcon from "@/assets/dindr-icon.png.asset.json";

/* ---------- iPhone status bar (consistent across screens) ---------- */

const IosSignal = () => (
  <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor" aria-hidden>
    <rect x="0"  y="7" width="3" height="4" rx="0.6" />
    <rect x="4.5" y="5" width="3" height="6" rx="0.6" />
    <rect x="9"  y="3" width="3" height="8" rx="0.6" />
    <rect x="13.5" y="0" width="3" height="11" rx="0.6" />
  </svg>
);

const IosWifi = () => (
  <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor" aria-hidden>
    <path d="M8 2.2C5.5 2.2 3.2 3.1 1.5 4.7L0 3.2C2 1.2 4.9 0 8 0s6 1.2 8 3.2l-1.5 1.5C12.8 3.1 10.5 2.2 8 2.2z"/>
    <path d="M8 5.2C6.4 5.2 4.9 5.8 3.8 6.8L2.4 5.4C3.9 4 5.9 3.2 8 3.2s4.1.8 5.6 2.2L12.2 6.8C11.1 5.8 9.6 5.2 8 5.2z"/>
    <path d="M8 8.2c-.8 0-1.6.3-2.2.9L8 11l2.2-1.9C9.6 8.5 8.8 8.2 8 8.2z"/>
  </svg>
);

const IosBattery = () => (
  <svg width="26" height="12" viewBox="0 0 26 12" aria-hidden>
    <rect x="0.5" y="0.5" width="22" height="11" rx="2.8" ry="2.8" fill="none" stroke="currentColor" strokeOpacity="0.45" />
    <rect x="2" y="2" width="19" height="8" rx="1.6" ry="1.6" fill="currentColor" />
    <rect x="23.5" y="3.5" width="1.8" height="5" rx="0.9" fill="currentColor" opacity="0.45" />
  </svg>
);

const StatusBar = () => (
  <div className="absolute top-0 left-0 right-0 z-40 h-[34px] flex items-center justify-between px-6 pt-2 text-foreground text-[12px] font-semibold pointer-events-none select-none">
    <span className="tabular-nums tracking-tight">9:41</span>
    <div className="flex items-center gap-[5px]">
      <IosSignal />
      <IosWifi />
      <IosBattery />
    </div>
  </div>
);

/* ---------- Phone frame (real iPhone 19.5:9 ratio) ---------- */

const PhoneFrame = ({ children }: { children: React.ReactNode }) => (
  <div className="relative mx-auto h-full aspect-[9/19.5] rounded-[2.6rem] bg-foreground/90 p-[5px] shadow-card">
    <div className="relative h-full w-full overflow-hidden rounded-[2.3rem] bg-background">
      {/* Dynamic Island */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 h-[26px] w-[88px] rounded-full bg-foreground" />
      <StatusBar />
      {children}
    </div>
  </div>
);

/* Screenshot screen — crops the status bar baked into the source screenshot
   so our synthetic iOS status bar above stays the only one visible. */
const ScreenshotScreen = ({
  src,
  alt,
  children,
}: {
  src: string;
  alt: string;
  children?: React.ReactNode;
}) => (
  <PhoneFrame>
    <div className="absolute inset-0 overflow-hidden">
      <img
        src={src}
        alt={alt}
        className="absolute left-0 right-0 w-full"
        style={{ top: "-6%", height: "106%", objectFit: "cover", objectPosition: "top" }}
      />
    </div>
    {children}
  </PhoneFrame>
);

const WelcomeScreen = () => {
  const { t } = useTranslation();
  return (
    <PhoneFrame>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center bg-gradient-to-b from-primary/10 via-background to-background">
        <img
          src={dindrIcon.url}
          alt="Dindr"
          className="h-28 w-28 rounded-[1.6rem] shadow-card mb-5 object-cover"
        />
        <div className="font-display font-extrabold text-3xl tracking-tight">Dindr</div>
        <div className="text-xs text-muted-foreground mt-1.5">
          {t("onboarding.welcome.tagline", { defaultValue: "Tinder for dinner" })}
        </div>
      </div>
    </PhoneFrame>
  );
};

/* Animated swipe-card demo on slide 2 — real recipe photo, auto right/left loop */
const DEMO_RECIPE = {
  image:
    "https://www.eefkooktzo.nl/wp-content/uploads/2026/04/crispy-chicken-tenders-uit-de-oven.jpg",
  title: "Crispy chicken tenders",
  time: 22,
  servings: 2,
};

const SwipeScreen = () => {
  const { t, i18n } = useTranslation();
  const cardX = useMotionValue(0);
  const [stamp, setStamp] = useState<"yum" | "nope" | null>(null);
  const peopleUnit = i18n.language?.startsWith("nl") ? "pers." : "ppl";

  useEffect(() => {
    let cancelled = false;
    const loop = async () => {
      while (!cancelled) {
        // right
        setStamp("yum");
        await animate(cardX, 60, { duration: 0.7, ease: "easeOut" });
        await new Promise((r) => setTimeout(r, 500));
        await animate(cardX, 0, { type: "spring", stiffness: 200, damping: 18 });
        setStamp(null);
        await new Promise((r) => setTimeout(r, 600));
        if (cancelled) return;
        // left
        setStamp("nope");
        await animate(cardX, -60, { duration: 0.7, ease: "easeOut" });
        await new Promise((r) => setTimeout(r, 500));
        await animate(cardX, 0, { type: "spring", stiffness: 200, damping: 18 });
        setStamp(null);
        await new Promise((r) => setTimeout(r, 700));
      }
    };
    loop();
    return () => {
      cancelled = true;
    };
  }, [cardX]);

  return (
    <PhoneFrame>
      <div className="absolute inset-0 bg-background pt-[38px] px-4 pb-4 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="font-display font-extrabold text-lg">Dindr</div>
          <div className="h-7 w-7 rounded-full bg-muted" />
        </div>
        <div className="relative flex-1 grid place-items-center">
          {/* back card */}
          <div className="absolute inset-x-3 top-3 bottom-6 rounded-2xl bg-muted/60" />
          <motion.div
            style={{ x: cardX, rotate: useTransformWrap(cardX) }}
            className="relative w-full h-full rounded-2xl overflow-hidden shadow-card bg-card"
          >
            <img src={DEMO_RECIPE.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3 text-white">
              <div className="font-display font-extrabold text-base leading-tight">
                {DEMO_RECIPE.title}
              </div>
              <div className="text-[11px] opacity-90 mt-1">
                ca. {DEMO_RECIPE.time} min · {DEMO_RECIPE.servings} {peopleUnit}
              </div>
            </div>
            {/* stamps */}
            {stamp === "yum" && (
              <div className="absolute top-4 left-3 rotate-[-18deg]">
                <div className="px-3 py-1 rounded-md border-[3px] border-emerald-500 bg-white/20 backdrop-blur-sm">
                  <span className="font-display font-extrabold text-2xl tracking-wider text-emerald-500">
                    YUM
                  </span>
                </div>
              </div>
            )}
            {stamp === "nope" && (
              <div className="absolute top-4 right-3 rotate-[14deg]">
                <div className="px-3 py-1 rounded-md border-[3px] border-rose-500 bg-white/20 backdrop-blur-sm">
                  <span className="font-display font-extrabold text-2xl tracking-wider text-rose-500">
                    NOPE
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        </div>
        {/* action buttons row */}
        <div className="flex items-center justify-center gap-6 mt-2">
          <div className="h-10 w-10 rounded-full bg-rose-500/15 grid place-items-center text-rose-500 text-lg">✕</div>
          <div className="h-12 w-12 rounded-full bg-emerald-500/15 grid place-items-center text-emerald-500 text-xl">♥</div>
        </div>
      </div>
    </PhoneFrame>
  );
};

function useTransformWrap(x: ReturnType<typeof useMotionValue<number>>) {
  return useTransform(x, [-100, 0, 100], [-8, 0, 8]);
}

const FiltersScreen = () => <ScreenshotScreen src={filtersShot.url} alt="Dindr filters" />;
const MatchesScreen = () => <ScreenshotScreen src={matchesShot.url} alt="Dindr matches" />;
const PlanScreen = () => <ScreenshotScreen src={planShot.url} alt="Dindr weekplan" />;

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
      { key: "matches", Screen: MatchesScreen },
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
              className="h-full flex flex-col px-4 cursor-grab active:cursor-grabbing"
              style={{ width: `${100 / steps.length}%`, flexShrink: 0 }}
            >
              <div className="basis-[78%] min-h-0 grid place-items-center py-2">
                <Screen />
              </div>
              <div className="basis-[22%] max-w-md w-full mx-auto text-center pt-2 px-2 overflow-hidden flex flex-col justify-start">
                <h1 className="font-display font-extrabold text-xl mb-1 leading-tight">
                  {t(`onboarding.${key}.title`)}
                </h1>
                <p className="text-xs text-muted-foreground leading-snug line-clamp-4">
                  {t(`onboarding.${key}.body`)}
                </p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

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
