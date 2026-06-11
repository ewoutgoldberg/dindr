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

  // Fullscreen API removed: the card already fills the viewport via fixed
  // positioning and the bottom nav is hidden, so no browser fullscreen toast
  // is needed (and the toast + X button were unwanted).


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
