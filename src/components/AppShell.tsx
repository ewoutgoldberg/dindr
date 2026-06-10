import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { CalendarDays, Flame, Heart, User, SlidersHorizontal, ChefHat, BookOpen, Sparkles, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { useIsCreator } from "@/hooks/useIsCreator";
import { PingPopup } from "@/components/PingPopup";

const today = () => format(new Date(), "yyyy-MM-dd");

type Tab = {
  to?: string | (() => string);
  match?: string;
  label: string;
  icon: typeof Flame;
  showBadge?: boolean;
  onClick?: () => void;
};

const activeSwipeDate = () => {
  if (typeof window === "undefined") return today();
  return sessionStorage.getItem("activeSwipeDate") || today();
};

const consumerTabs: Tab[] = [
  { to: "/filters", label: "Filters", icon: SlidersHorizontal },
  { to: () => `/swipe/${activeSwipeDate()}`, match: "/swipe", label: "Swipe", icon: Flame },
  { to: "/matches", label: "Matches", icon: Heart },
  { to: "/plan", label: "Plan", icon: CalendarDays },
  { to: "/profile", label: "MyKitchen", icon: User, showBadge: true },
];


export const AppShell = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const unread = useUnreadNotifications();
  const { isCreator, creatorId } = useIsCreator();

  const creatorTabs: Tab[] = [
    { to: "/creator/dashboard", match: "/creator/dashboard", label: "Dashboard", icon: ChefHat },
    { to: "/creator/recipes", match: "/creator/recipes", label: "Recepten", icon: BookOpen },
    { to: "/creator/inspiration", match: "/creator/inspiration", label: "Inspiratie", icon: Sparkles },
    { to: "/creator/insights", match: "/creator/insights", label: "Inzichten", icon: BarChart3 },
    { to: "/profile", match: "/profile", label: "MyKitchen", icon: User, showBadge: true },
  ];

  const tabs = isCreator ? creatorTabs : consumerTabs;
  const hideNav = pathname.startsWith("/swipe-favorites") || pathname === "/auth";
  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-background">
      {!hideNav && (
        <div
          aria-hidden
          className="fixed top-0 inset-x-0 z-40 bg-background/95 backdrop-blur-xl"
          style={{ height: "var(--app-safe-top)" }}
        />
      )}
      {!hideNav && <PingPopup />}
      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain safe-top flex flex-col">{children}</main>

      {!hideNav && (
        <nav className="app-bottom-nav safe-bottom">
          <div className={cn("app-bottom-nav-grid", tabs.length === 4 ? "grid-cols-4" : "grid-cols-5")}>
            {tabs.map(({ to, label, icon: Icon, onClick, ...rest }, idx) => {
              const matchPath = ("match" in rest ? rest.match : (typeof to === "string" ? to : "")) ?? "";
              const showBadge = "showBadge" in rest && rest.showBadge && unread > 0;
              const active = matchPath ? pathname.startsWith(matchPath) : false;
              const content = (
                <>
                  <span className="relative">
                    <Icon className={cn("h-6 w-6 transition-transform", active && "scale-110")} strokeWidth={active ? 2.5 : 2} />
                    {showBadge && (
                      <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-bold grid place-items-center">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </span>
                  <span className="block text-[10px] font-semibold uppercase tracking-wide leading-none">{label}</span>
                </>
              );
              const baseClass = "h-full min-h-0 flex flex-col items-center justify-center gap-1 rounded-xl transition-colors";
              if (onClick) {
                return (
                  <button
                    key={`${label}-${idx}`}
                    type="button"
                    onClick={onClick}
                    data-label={label}
                    className={cn(baseClass, "text-muted-foreground hover:text-foreground")}
                  >
                    {content}
                  </button>
                );
              }
              let target = typeof to === "function" ? to() : (to as string);
              if (label === "Matches" && pathname.startsWith("/swipe/")) {
                const swipeDate = pathname.split("/")[2];
                if (swipeDate) target = `/matches?date=${swipeDate}`;
              }
              return (
                <NavLink
                  key={matchPath || `${label}-${idx}`}
                  to={target}
                  data-label={label}
                  className={cn(baseClass, active ? "text-primary" : "text-muted-foreground hover:text-foreground")}
                >
                  {content}
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
};
