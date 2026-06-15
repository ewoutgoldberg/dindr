import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  const [direction, setDirection] = useState(1);
  const isLast = i === steps.length - 1;

  const finish = async () => {
    if (user && !replay) {
      await supabase.from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("id", user.id);
    }
    navigate(`/swipe/${fmtDateKey(new Date())}`, { replace: true });
  };

  const next = () => {
    if (isLast) return finish();
    setDirection(1);
    setI((v) => v + 1);
  };

  const back = () => {
    if (i === 0) return;
    setDirection(-1);
    setI((v) => v - 1);
  };

  const step = steps[i];

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

      {/* Content */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step.key}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.25 }}
            className="flex-1 min-h-0 flex flex-col px-6"
          >
            <div className="flex-1 min-h-0 grid place-items-center">
              <div className="w-full max-w-sm aspect-[4/3] rounded-3xl overflow-hidden shadow-card bg-muted">
                <img
                  src={step.img}
                  alt=""
                  className="w-full h-full object-cover"
                  width={1024}
                  height={768}
                  loading="eager"
                />
              </div>
            </div>
            <div className="max-w-md w-full mx-auto text-center pb-2">
              <h1 className="font-display font-extrabold text-2xl mb-2">
                {t(`onboarding.${step.key}.title`)}
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t(`onboarding.${step.key}.body`)}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer: dots + next */}
      <div className="shrink-0 px-6 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)] max-w-md w-full mx-auto">
        <div className="flex items-center justify-center gap-2 mb-4">
          {steps.map((s, idx) => (
            <span
              key={s.key}
              className={cn(
                "h-1.5 rounded-full transition-all",
                idx === i ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
              )}
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
