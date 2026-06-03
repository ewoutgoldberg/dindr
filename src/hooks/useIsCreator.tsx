import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const VIEW_MODE_KEY = "dindr:viewMode";

export const getViewMode = (): "creator" | "consumer" => {
  if (typeof window === "undefined") return "creator";
  return (localStorage.getItem(VIEW_MODE_KEY) as "creator" | "consumer") ?? "creator";
};

export const setViewMode = (mode: "creator" | "consumer") => {
  localStorage.setItem(VIEW_MODE_KEY, mode);
  window.dispatchEvent(new Event("dindr:viewModeChange"));
};

export const useIsCreator = () => {
  const { user, loading } = useAuth();
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"creator" | "consumer">(getViewMode());

  useEffect(() => {
    const onChange = () => setMode(getViewMode());
    window.addEventListener("dindr:viewModeChange", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("dindr:viewModeChange", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setCreatorId(null);
      setHandle(null);
      setReady(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("food_creators")
        .select("id, handle")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setCreatorId(data?.id ?? null);
      setHandle(data?.handle ?? null);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  const hasCreator = !!creatorId;
  return {
    isCreator: hasCreator && mode === "creator",
    hasCreatorProfile: hasCreator,
    creatorId,
    handle,
    viewMode: mode,
    loading: loading || !ready,
  };
};
