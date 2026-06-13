import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser as CapacitorBrowser } from "@capacitor/browser";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx>({ user: null, session: null, loading: true, signOut: async () => {} });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
      // Always start in the consumer (user) account after sign-in, even for users
      // who also have a creator profile. They can still switch to creator mode
      // afterwards via the profile menu.
      if (event === "SIGNED_IN") {
        try {
          localStorage.setItem("dindr:viewMode", "consumer");
          window.dispatchEvent(new Event("dindr:viewModeChange"));
        } catch { /* noop */ }
      }
    });

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      setLoading(false);
    });

    // Native deep-link OAuth callback handler (iOS/Android via Capacitor).
    // Expected callback URL: app.dindr://oauth-callback#access_token=...&refresh_token=...
    let removeListener: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener("appUrlOpen", async ({ url }) => {
        try {
          if (!url || !url.startsWith("app.dindr://")) return;
          // Tokens can arrive in the URL hash (implicit) or as ?code= (PKCE)
          const hashIndex = url.indexOf("#");
          const queryIndex = url.indexOf("?");
          const hash = hashIndex >= 0 ? url.substring(hashIndex + 1) : "";
          const query = queryIndex >= 0 ? url.substring(queryIndex + 1, hashIndex >= 0 ? hashIndex : undefined) : "";
          const params = new URLSearchParams(hash || query);
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");
          const code = params.get("code");

          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
          } else if (code) {
            await supabase.auth.exchangeCodeForSession(code);
          }
        } catch (e) {
          console.error("OAuth deep-link handling failed", e);
        } finally {
          try { await CapacitorBrowser.close(); } catch { /* noop */ }
        }
      }).then((handle) => {
        removeListener = () => handle.remove();
      });
    }

    return () => {
      subscription.unsubscribe();
      removeListener?.();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
