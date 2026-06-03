import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const useIsCreator = () => {
  const { user, loading } = useAuth();
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

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

  return { isCreator: !!creatorId, creatorId, handle, loading: loading || !ready };
};
