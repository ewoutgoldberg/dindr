import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

// Detect Capacitor/native WebView shells so safe-area padding can fall back to a sensible minimum
// even when env(safe-area-inset-top) reports 0 inside the WKWebView.
if (typeof window !== "undefined") {
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  const ua = navigator.userAgent || "";
  const isCapacitor = !!w.Capacitor || /Capacitor/i.test(ua) || location.protocol === "capacitor:" || location.protocol === "ionic:";
  const isStandaloneIOS = (navigator as unknown as { standalone?: boolean }).standalone === true;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && (navigator as Navigator & { maxTouchPoints: number }).maxTouchPoints > 1);
  if (isCapacitor || isStandaloneIOS) {
    document.documentElement.classList.add("native-shell");
  }
  if (isIOS) {
    document.documentElement.classList.add("ios-device");
  }
}

createRoot(document.getElementById("root")!).render(<App />);
