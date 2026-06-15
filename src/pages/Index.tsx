import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { fmtDateKey } from "@/lib/dates";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { user, loading } = useAuth();
  const [checked, setChecked] = useState(false);
  const [onboarded, setOnboarded] = useState<boolean>(true);

  useEffect(() => {
    let alive = true;
    if (!user) {
      setChecked(true);
      return;
    }
    supabase
      .from("profiles")
      .select("onboarded_at")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        setOnboarded(!!data?.onboarded_at);
        setChecked(true);
      });
    return () => {
      alive = false;
    };
  }, [user]);

  if (loading || (user && !checked))
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  if (!user) return <Navigate to="/auth" replace />;
  if (!onboarded) return <Navigate to="/onboarding" replace />;
  return <Navigate to={`/swipe/${fmtDateKey(new Date())}`} replace />;
};

export default Index;

