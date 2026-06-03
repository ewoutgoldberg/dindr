import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const useIsAdmin = () => {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    (async () => {
      console.log("[useIsAdmin] querying for user", user.id);
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (cancelled) return;
      console.log("[useIsAdmin] result", { data, error });
      if (error) console.error("useIsAdmin error", error);
      setIsAdmin(!!data);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  return { isAdmin: !!isAdmin, loading: loading || isAdmin === null };
};
