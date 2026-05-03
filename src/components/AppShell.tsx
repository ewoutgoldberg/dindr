import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { CalendarDays, Flame, Heart, ShoppingCart, User, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const today = () => format(new Date(), "yyyy-MM-dd");

const tabs = [
  { to: () => `/swipe/${today()}`, match: "/swipe", label: "Swipe", icon: Flame },
  { to: "/matches", label: "Matches", icon: Heart },
  { to: "/filters", label: "Filters", icon: SlidersHorizontal },
  { to: "/plan", label: "Plan", icon: CalendarDays },
  { to: "/shopping", label: "List", icon: ShoppingCart },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export const AppShell = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const hideNav = pathname.startsWith("/swipe-favorites") || pathname === "/auth";
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className={cn("flex-1 flex flex-col", !hideNav && "pb-24")}>{children}</main>
      {!hideNav && (
        <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl safe-bottom">
          <div className="max-w-md mx-auto grid grid-cols-6 px-2 pt-2">
            {tabs.map(({ to, label, icon: Icon, ...rest }) => {
              const matchPath = "match" in rest ? rest.match : (to as string);
              const target = typeof to === "function" ? to() : to;
              return (
                <NavLink
                  key={matchPath}
                  to={target}
                  className={({ isActive }) =>
                    cn(
                      "flex flex-col items-center gap-1 py-2 rounded-xl transition-colors",
                      (isActive || pathname.startsWith(matchPath)) ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )
                  }
                >
                  {({ isActive }) => {
                    const active = isActive || pathname.startsWith(matchPath);
                    return (
                      <>
                        <Icon className={cn("h-6 w-6 transition-transform", active && "scale-110")} strokeWidth={active ? 2.5 : 2} />
                        <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
                      </>
                    );
                  }}
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
};
