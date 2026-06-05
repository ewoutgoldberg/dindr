import { useEffect, useState } from "react";
import { RotateCw } from "lucide-react";

export const OrientationGate = ({ children }: { children: React.ReactNode }) => {
  const [isLandscape, setIsLandscape] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(orientation: landscape)").matches
      : true
  );

  useEffect(() => {
    const mq = window.matchMedia("(orientation: landscape)");
    const handler = (e: MediaQueryListEvent) => setIsLandscape(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (!isTouch) return;
    const el = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
    };
    const doc = document as Document & {
      webkitExitFullscreen?: () => Promise<void>;
      webkitFullscreenElement?: Element | null;
    };
    const inFs = () => !!(document.fullscreenElement || doc.webkitFullscreenElement);
    const enter = () => {
      if (inFs()) return;
      const req = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
      req?.().catch(() => {});
    };
    const exit = () => {
      if (!inFs()) return;
      const ex = document.exitFullscreen?.bind(document) ?? doc.webkitExitFullscreen?.bind(doc);
      ex?.().catch(() => {});
    };

    if (isLandscape) {
      // Try immediately (works if triggered by a recent user gesture)
      enter();
      // Fallback: request on next user interaction (required by most browsers)
      const onGesture = () => {
        enter();
        window.removeEventListener("touchstart", onGesture);
        window.removeEventListener("click", onGesture);
      };
      window.addEventListener("touchstart", onGesture, { passive: true });
      window.addEventListener("click", onGesture);
      return () => {
        window.removeEventListener("touchstart", onGesture);
        window.removeEventListener("click", onGesture);
      };
    } else {
      exit();
    }
  }, [isLandscape]);


  // Only show overlay on touch devices in portrait
  const isTouch =
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches;

  if (!isLandscape && isTouch) {
    return (
      <div className="fixed inset-0 z-50 bg-background grid place-items-center text-center p-8">
        <div>
          <RotateCw className="h-16 w-16 mx-auto text-primary animate-pulse" />
          <h2 className="font-display font-extrabold text-2xl mt-6">
            Draai je telefoon
          </h2>
          <p className="text-muted-foreground mt-2 max-w-xs mx-auto">
            Bekijk dit recept als een echte Marley Spoon-receptkaart in landscape.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
