import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export const RequireAdmin = ({ children }: { children: ReactNode }) => {
  const { isAdmin, loading } = useIsAdmin();
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};
