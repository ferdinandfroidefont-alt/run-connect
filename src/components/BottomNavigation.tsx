import { useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Calendar,
  MessageCircle,
  Newspaper,
  PenTool,
  GraduationCap,
  Crown,
} from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";

type NavItem = {
  path: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
  label: string;
  tutorialId?: string;
  /** Fond type Paramètres (carré coloré + picto blanc) */
  colorClass: string;
  isActive: (pathname: string) => boolean;
  showUnreadBadge?: boolean;
};

export const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const { hideBottomNav } = useAppContext();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeItemRef = useRef<HTMLButtonElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const pathname = location.pathname;

  const navItems = useMemo<NavItem[]>(
    () => [
      {
        path: "/",
        icon: Home,
        label: t("navigation.home"),
        colorClass: "bg-[#007AFF]",
        isActive: (p) => p === "/",
      },
      {
        path: "/my-sessions",
        icon: Calendar,
        label: t("navigation.mySessions"),
        tutorialId: "nav-sessions",
        colorClass: "bg-[#34C759]",
        isActive: (p) => p === "/my-sessions" || p.startsWith("/my-sessions/"),
      },
      {
        path: "/messages",
        icon: MessageCircle,
        label: t("navigation.messages"),
        tutorialId: "nav-messages",
        colorClass: "bg-[#5856D6]",
        isActive: (p) => p === "/messages" || p.startsWith("/messages/"),
        showUnreadBadge: true,
      },
      {
        path: "/feed",
        icon: Newspaper,
        label: t("navigation.feed"),
        tutorialId: "nav-feed",
        colorClass: "bg-[#FF9500]",
        isActive: (p) => p === "/feed" || p.startsWith("/feed/"),
      },
      {
        path: "/itinerary",
        icon: PenTool,
        label: t("navigation.itinerary"),
        colorClass: "bg-[#AF52DE]",
        isActive: (p) =>
          p === "/itinerary" ||
          p.startsWith("/itinerary/") ||
          p === "/route-create" ||
          p === "/route-creation" ||
          p.startsWith("/route-creation/"),
      },
      {
        path: "/coaching",
        icon: GraduationCap,
        label: t("navigation.coaching"),
        colorClass: "bg-[#5AC8FA]",
        isActive: (p) => p === "/coaching" || p.startsWith("/coaching/"),
      },
      {
        path: "/leaderboard",
        icon: Crown,
        label: t("navigation.leaderboard"),
        colorClass: "bg-[#FFCC00]",
        isActive: (p) => p === "/leaderboard" || p.startsWith("/leaderboard/"),
      },
    ],
    [t]
  );

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id")
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`);

      const convIds = (conversations || []).map((c) => c.id);
      if (convIds.length === 0) {
        setTotalUnreadCount(0);
        return;
      }

      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", convIds)
        .neq("sender_id", user.id)
        .is("read_at", null);

      setTotalUnreadCount(count || 0);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const scheduleFetch = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        void fetchUnreadCount();
      }, 450);
    };

    void fetchUnreadCount();
    window.addEventListener("messages-read", scheduleFetch);

    const channel = supabase
      .channel(`unread-messages-count-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, scheduleFetch)
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      window.removeEventListener("messages-read", scheduleFetch);
      supabase.removeChannel(channel);
    };
  }, [user, fetchUnreadCount]);

  const activeIndex = navItems.findIndex((item) => item.isActive(pathname));

  useEffect(() => {
    const el = activeItemRef.current;
    const scroller = scrollerRef.current;
    if (!el || !scroller || activeIndex < 0) return;
    const t = window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }, 50);
    return () => clearTimeout(t);
  }, [pathname, activeIndex, navItems.length]);

  if (hideBottomNav) return null;

  return (
    <nav
      className={cn(
        "relative z-[100] w-full shrink-0 border-t border-border/60 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/85",
        "pointer-events-auto"
      )}
      role="navigation"
      aria-label="Navigation principale"
      style={{ paddingBottom: "var(--safe-area-bottom)" }}
    >
      <div className="ios-nav-shell relative min-h-[var(--nav-height)] w-full max-w-full overflow-hidden pt-1">
        <div
          ref={scrollerRef}
          className={cn(
            "flex max-w-full snap-x snap-proximity scroll-pl-4 gap-3 overflow-x-auto overflow-y-hidden",
            /* Marge droite : évite que le dernier item passe sous le FAB « + » */
            "scroll-pr-[5rem] pl-4 pr-[4.75rem] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "touch-pan-x [-webkit-overflow-scrolling:touch]"
          )}
        >
          {navItems.map((item) => {
            const { path, icon: Icon, label, tutorialId, showUnreadBadge, colorClass } = item;
            const isActive = item.isActive(pathname);
            const showBadge = !!showUnreadBadge && totalUnreadCount > 0;
            return (
              <button
                key={item.path}
                ref={isActive ? activeItemRef : undefined}
                type="button"
                onClick={() => navigate(path)}
                data-tutorial={tutorialId}
                className={cn(
                  "flex min-w-[4.5rem] max-w-[5.25rem] shrink-0 snap-start flex-col items-center gap-1 pb-1 pt-0.5",
                  "touch-manipulation transition-transform duration-200 ease-ios",
                  "active:scale-[0.94]"
                )}
              >
                <div className="relative shrink-0 px-0.5">
                  <div
                    className={cn(
                      "ios-nav-rail-icon text-white",
                      colorClass,
                      isActive
                        ? "shadow-md ring-2 ring-primary/90 ring-offset-2 ring-offset-background brightness-[1.02] dark:ring-offset-background"
                        : "opacity-[0.92]"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 text-white" strokeWidth={isActive ? 2.35 : 2} aria-hidden />
                  </div>
                  {showBadge && (
                    <span className="absolute -right-0.5 -top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full border border-background bg-destructive px-0.5 text-[9px] font-bold text-destructive-foreground shadow-sm">
                      {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    "max-w-[5rem] truncate text-center text-[10px] font-medium leading-tight tracking-tight",
                    isActive ? "font-semibold text-primary" : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
