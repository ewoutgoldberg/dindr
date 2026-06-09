import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Detect Capacitor/native WebView shells so safe-area padding can fall back to a sensible minimum
// even when env(safe-area-inset-top) reports 0 inside the WKWebView.
if (typeof window !== "undefined") {
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  const isCapacitor = !!w.Capacitor && (w.Capacitor.isNativePlatform?.() ?? true);
  const ua = navigator.userAgent || "";
  const isStandaloneIOS = (navigator as unknown as { standalone?: boolean }).standalone === true;
  if (isCapacitor || isStandaloneIOS || /Capacitor/i.test(ua)) {
    document.documentElement.classList.add("native-shell");
  }
}

createRoot(document.getElementById("root")!).render(<App />);
