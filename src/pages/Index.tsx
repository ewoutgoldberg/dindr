import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { fmtDateKey } from "@/lib/dates";

const Index = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  return <Navigate to={user ? `/swipe/${fmtDateKey(new Date())}` : "/auth"} replace />;
};

export default Index;
