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

import filtersShot from "@/assets/onboarding-filters.png.asset.json";
import matchesShot from "@/assets/onboarding-matches.png.asset.json";
import planShot from "@/assets/onboarding-plan.png.asset.json";
import dindrIcon from "@/assets/dindr-icon.png.asset.json";

/* ---------- iPhone status bar (consistent across screens) ---------- */

const IosSignal = () => (
  <svg width="11" height="7" viewBox="0 0 18 12" fill="currentColor" aria-hidden="true">
    <rect x="0"  y="8" width="3" height="4"  rx="0.8" />
    <rect x="5"  y="6" width="3" height="6"  rx="0.8" />
    <rect x="10" y="3" width="3" height="9"  rx="0.8" />
    <rect x="15" y="0" width="3" height="12" rx="0.8" />
  </svg>
);

const IosWifi = () => (
  <svg width="10" height="7" viewBox="0 0 17 12" fill="currentColor" aria-hidden="true">
    <path d="M8.5 2.4C5.7 2.4 3.1 3.4 1.2 5.2L0 4C2.2 1.7 5.2.4 8.5.4S14.8 1.7 17 4l-1.2 1.2C13.9 3.4 11.3 2.4 8.5 2.4z" />
    <path d="M8.5 5.5C6.6 5.5 4.8 6.2 3.5 7.5L2.2 6.2C3.9 4.6 6.1 3.7 8.5 3.7s4.6.9 6.3 2.5L13.5 7.5C12.2 6.2 10.4 5.5 8.5 5.5z" />
    <path d="M8.5 8.6c-1 0-1.9.4-2.6 1.1L8.5 12l2.6-2.3c-.7-.7-1.6-1.1-2.6-1.1z" />
  </svg>
);

const IosBattery = () => (
  <svg width="17" height="8" viewBox="0 0 27 13" aria-hidden="true">
    <rect x="0.5" y="0.5" width="23" height="12" rx="3" ry="3" fill="none" stroke="currentColor" strokeOpacity="0.5" />
    <rect x="2" y="2" width="20" height="9" rx="1.8" ry="1.8" fill="currentColor" />
    <rect x="24.5" y="4" width="2" height="5" rx="1" fill="currentColor" opacity="0.5" />
  </svg>
);

const StatusBar = () => (
  <div className="absolute top-0 left-0 right-0 z-40 h-[34px] flex items-center justify-between px-2 pt-1.5 text-foreground text-[9px] font-semibold pointer-events-none select-none">
    <span className="tabular-nums tracking-tight">9:41</span>
    <div className="flex items-center gap-[3px]">
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

/* Screenshot screen — crops both the source status bar (top) and the source
   bottom nav (bottom) so our synthetic status bar + mock nav are the only
   ones visible, identical across every screen. */
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
    <div className="absolute left-0 right-0 top-[34px] bottom-[58px] overflow-hidden bg-background">
      <img
        src={src}
        alt={alt}
        className="absolute left-0 right-0 w-full"
        style={{ top: "-9%", height: "118%", objectFit: "cover", objectPosition: "top" }}
      />
    </div>
    <MockBottomNav />
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

/* Animated swipe-card demo on slide 2 — real recipe photos + mock bottom nav */
const DEMO_RECIPES = [
  {
    image: "https://www.eefkooktzo.nl/wp-content/uploads/2026/05/Krokante-gyoza-skirt.jpg",
    title: "Krokante gyoza skirt",
    time: 25,
    servings: 2,
  },
  {
    image:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80",
    title: "Bowl met geroosterde groenten",
    time: 30,
    servings: 2,
  },
];

const MockBottomNav = () => {
  const { t } = useTranslation();
  const items = [
    { icon: SlidersHorizontal, label: t("nav.filters") },
    { icon: Flame, label: t("nav.swipe"), active: true },
    { icon: Heart, label: t("nav.matches") },
    { icon: CalendarDays, label: t("nav.plan") },
    { icon: User, label: t("nav.myKitchen") },
  ];
  return (
    <div className="absolute bottom-0 inset-x-0 h-[58px] bg-background border-t border-border grid grid-cols-5 px-0">
      {items.map(({ icon: Icon, label, active }, i) => (
        <div
          key={i}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 min-w-0 px-0",
            active ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Icon className="h-[17px] w-[17px]" strokeWidth={active ? 2.5 : 2} />
          <span className="text-[7px] font-semibold leading-none whitespace-nowrap text-center">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
};

const SwipeScreen = () => {
  const { i18n } = useTranslation();
  const cardX = useMotionValue(0);
  const cardRotate = useTransform(cardX, [-120, 0, 120], [-10, 0, 10]);
  const cardOpacity = useTransform(cardX, [-180, -90, 0, 90, 180], [0, 1, 1, 1, 0]);
  const [stamp, setStamp] = useState<"yum" | "nope" | null>(null);
  const [topIdx, setTopIdx] = useState(0);
  const peopleUnit = i18n.language?.startsWith("nl") ? "pers." : "ppl";

  const top = DEMO_RECIPES[topIdx % DEMO_RECIPES.length];
  const behind = DEMO_RECIPES[(topIdx + 1) % DEMO_RECIPES.length];

  useEffect(() => {
    let cancelled = false;
    const loop = async () => {
      while (!cancelled) {
        setStamp("yum");
        await animate(cardX, 70, { duration: 0.7, ease: "easeOut" });
        await new Promise((r) => setTimeout(r, 550));
        await animate(cardX, 0, { type: "spring", stiffness: 200, damping: 18 });
        setStamp(null);
        await new Promise((r) => setTimeout(r, 650));
        if (cancelled) return;
        setStamp("nope");
        await animate(cardX, -70, { duration: 0.7, ease: "easeOut" });
        await new Promise((r) => setTimeout(r, 550));
        await animate(cardX, 0, { type: "spring", stiffness: 200, damping: 18 });
        setStamp(null);
        await new Promise((r) => setTimeout(r, 750));
      }
    };
    loop();
    return () => {
      cancelled = true;
    };
  }, [cardX]);

  return (
    <PhoneFrame>
      <div className="absolute inset-0 bg-background pt-[38px] pb-[58px] px-4 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="font-display font-extrabold text-lg">Dindr</div>
          <div className="h-7 w-7 rounded-full bg-muted" />
        </div>
        <div className="relative flex-1 grid place-items-center">
          {/* Card behind (next recipe) */}
          <div
            className="absolute inset-x-3 top-3 bottom-3 rounded-2xl overflow-hidden shadow-card bg-card"
            style={{ transform: "scale(0.95)" }}
          >
            <img src={behind.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3 text-white">
              <div className="font-display font-extrabold text-[15px] leading-tight">
                {behind.title}
              </div>
            </div>
          </div>
          {/* Top card (animated) */}
          <motion.div
            style={{ x: cardX, rotate: cardRotate, opacity: cardOpacity }}
            className="relative w-full h-full rounded-2xl overflow-hidden shadow-card bg-card"
          >
            <img src={top.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pt-6 pb-3 text-white">
              <div className="font-display font-extrabold text-[15px] leading-tight whitespace-nowrap">
                {top.title}
              </div>
              <div className="text-[11px] opacity-90 mt-1">
                ca. {top.time} min · {top.servings} {peopleUnit}
              </div>
            </div>
            {stamp === "yum" && (
              <div className="absolute top-4 left-3 rotate-[-18deg]">
                <div className="px-3 py-1 rounded-md border-[3px] border-emerald-500 bg-white/20 backdrop-blur-sm">
                  <span className="font-display font-extrabold text-2xl tracking-wider text-emerald-500">YUM</span>
                </div>
              </div>
            )}
            {stamp === "nope" && (
              <div className="absolute top-4 right-3 rotate-[14deg]">
                <div className="px-3 py-1 rounded-md border-[3px] border-rose-500 bg-white/20 backdrop-blur-sm">
                  <span className="font-display font-extrabold text-2xl tracking-wider text-rose-500">NOPE</span>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
      <MockBottomNav />
    </PhoneFrame>
  );
};

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
