import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, PanInfo, useMotionValue, animate } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fmtDateKey } from "@/lib/dates";
import welcomeImg from "@/assets/onboarding-welcome.jpg";
import swipeImg from "@/assets/onboarding-swipe.jpg";
import filtersImg from "@/assets/onboarding-filters.jpg";
import partnerImg from "@/assets/onboarding-partner.jpg";
import planImg from "@/assets/onboarding-plan.jpg";

const Onboarding = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const replay = params.get("replay") === "1";

  const steps = useMemo(
    () => [
      { key: "welcome", img: welcomeImg },
      { key: "swipe", img: swipeImg },
      { key: "filters", img: filtersImg },
      { key: "partner", img: partnerImg },
      { key: "plan", img: planImg },
    ],
    []
  );

  const [i, setI] = useState(0);
  const isLast = i === steps.length - 1;

  const trackRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const x = useMotionValue(0);

  // Measure container width for slide math
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const update = () => setWidth(el.offsetWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Animate to current slide whenever index or width changes
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
          {steps.map((step) => (
            <div
              key={step.key}
              className="h-full flex flex-col px-6 cursor-grab active:cursor-grabbing"
              style={{ width: `${100 / steps.length}%`, flexShrink: 0 }}
            >
              <div className="flex-1 min-h-0 grid place-items-center">
                <div className="w-full max-w-sm aspect-[9/16] rounded-[2rem] overflow-hidden shadow-card bg-muted">
                  <img
                    src={step.img}
                    alt=""
                    className="w-full h-full object-cover select-none"
                    draggable={false}
                  />
                </div>
              </div>
              <div className="max-w-md w-full mx-auto text-center pb-2 pt-4">
                <h1 className="font-display font-extrabold text-2xl mb-2">
                  {t(`onboarding.${step.key}.title`)}
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(`onboarding.${step.key}.body`)}
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
