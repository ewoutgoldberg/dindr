import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { CalendarDays, Flame, Heart, ShoppingCart, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/plan", label: "Plan", icon: CalendarDays },
  { to: "/swipe", label: "Swipe", icon: Flame },
  { to: "/matches", label: "Matches", icon: Heart },
  { to: "/shopping", label: "List", icon: ShoppingCart },
  { to: "/profile", label: "Profile", icon: User },
];

export const AppShell = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const hideNav = pathname.startsWith("/recipe/") || pathname === "/auth" || pathname.startsWith("/swipe/");
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className={cn("flex-1 flex flex-col", !hideNav && "pb-24")}>{children}</main>
      {!hideNav && (
        <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl safe-bottom">
          <div className="max-w-md mx-auto grid grid-cols-5 px-2 pt-2">
            {tabs.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center gap-1 py-2 rounded-xl transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cn("h-6 w-6 transition-transform", isActive && "scale-110")} strokeWidth={isActive ? 2.5 : 2} />
                    <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
};
