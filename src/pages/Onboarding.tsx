import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, PanInfo, useMotionValue, animate } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Signal, Wifi, BatteryFull } from "lucide-react";
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

const StatusBar = () => (
  <div className="absolute top-0 left-0 right-0 z-40 h-[34px] flex items-center justify-between px-5 pt-1 text-foreground text-[11px] font-semibold pointer-events-none select-none">
    <span className="tabular-nums tracking-tight">9:41</span>
    <div className="flex items-center gap-1">
      <Signal className="h-3 w-3" strokeWidth={2.5} fill="currentColor" />
      <Wifi className="h-3 w-3" strokeWidth={2.5} />
      <BatteryFull className="h-3.5 w-3.5" strokeWidth={2} />
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
    <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover object-top" />
    {children}
  </PhoneFrame>
);

const WelcomeScreen = () => (
  <PhoneFrame>
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center bg-gradient-to-b from-primary/10 via-background to-background">
      <img
        src={dindrIcon.url}
        alt="Dindr"
        className="h-24 w-24 rounded-[1.4rem] shadow-card mb-5"
      />
      <div className="font-display font-extrabold text-3xl tracking-tight">Dindr</div>
      <div className="text-xs text-muted-foreground mt-1.5">Tinder for dinner</div>
    </div>
  </PhoneFrame>
);

const SwipeScreen = () => (
  <ScreenshotScreen src={swipeShot.url} alt="Dindr swipe">
    {/* YUM stamp like swiping right */}
    <div className="absolute top-[28%] left-6 z-30 rotate-[-18deg]">
      <div className="px-3 py-1 rounded-md border-[3px] border-emerald-500 bg-background/30 backdrop-blur-sm">
        <span className="font-display font-extrabold text-2xl tracking-wider text-emerald-500">
          YUM
        </span>
      </div>
    </div>
  </ScreenshotScreen>
);
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
