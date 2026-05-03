import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Partner = { id: string; display_name: string | null; avatar_url: string | null };

export const usePartner = () => {
  const { user } = useAuth();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setPartner(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data: p } = await supabase
        .from("partnerships")
        .select("user_a, user_b")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .maybeSingle();
      if (!p) {
        setPartner(null);
        setLoading(false);
        return;
      }
      const partnerId = p.user_a === user.id ? p.user_b : p.user_a;
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("id", partnerId)
        .maybeSingle();
      setPartner(prof ?? { id: partnerId, display_name: null, avatar_url: null });
      setLoading(false);
    };
    load();
  }, [user]);

  return { partner, loading };
};
