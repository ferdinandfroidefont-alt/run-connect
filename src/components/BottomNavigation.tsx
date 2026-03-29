import { useLocation, useNavigate } from "react-router-dom";
import { Home, Calendar, MessageCircle, Newspaper, GraduationCap } from "lucide-react";
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
  isActive: (pathname: string) => boolean;
  showUnreadBadge?: boolean;
};

const ITEM_GAP_PX = 12;
const FAB_RESERVE_PX = 76;

export const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const { hideBottomNav } = useAppContext();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [edgePadPx, setEdgePadPx] = useState(0);
  const firstLayoutDoneRef = useRef(false);
  const centerScrollRafRef = useRef<number | null>(null);

  const pathname = location.pathname;

  const navItems = useMemo<NavItem[]>(
    () => [
      { path: "/", icon: Home, label: t("navigation.home"), isActive: (p) => p === "/" },
      {
        path: "/my-sessions",
        icon: Calendar,
        label: t("navigation.mySessions"),
        tutorialId: "nav-sessions",
        isActive: (p) => p === "/my-sessions" || p.startsWith("/my-sessions/"),
      },
      {
        path: "/messages",
        icon: MessageCircle,
        label: t("navigation.messages"),
        tutorialId: "nav-messages",
        isActive: (p) => p === "/messages" || p.startsWith("/messages/"),
        showUnreadBadge: true,
      },
      {
        path: "/feed",
        icon: Newspaper,
        label: t("navigation.feed"),
        tutorialId: "nav-feed",
        isActive: (p) => p === "/feed" || p.startsWith("/feed/"),
      },
      {
        path: "/coaching",
        icon: GraduationCap,
        label: t("navigation.coaching"),
        isActive: (p) => p === "/coaching" || p.startsWith("/coaching/"),
      },
    ],
    [t]
  );

  const activeIndex = useMemo(
    () => navItems.findIndex((item) => item.isActive(pathname)),
    [navItems, pathname]
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

  const recomputeEdgePad = useCallback(() => {
    const sc = scrollerRef.current;
    const first = itemRefs.current[0];
    if (!sc) return;
    const w = first?.getBoundingClientRect().width ?? 92;
    const pad = Math.max(0, sc.clientWidth / 2 - w / 2);
    setEdgePadPx(pad);
  }, []);

  useEffect(() => {
    const sc = scrollerRef.current;
    if (!sc || hideBottomNav) return;

    recomputeEdgePad();
    const ro = new ResizeObserver(() => {
      window.requestAnimationFrame(recomputeEdgePad);
    });
    ro.observe(sc);
    return () => ro.disconnect();
  }, [hideBottomNav, recomputeEdgePad, navItems.length]);

  const scrollActiveToCenter = useCallback(
    (animated: boolean) => {
      const sc = scrollerRef.current;
      if (!sc || activeIndex < 0) return;
      const el = itemRefs.current[activeIndex];
      if (!el) return;

      if (centerScrollRafRef.current !== null) {
        cancelAnimationFrame(centerScrollRafRef.current);
        centerScrollRafRef.current = null;
      }

      const scRect = sc.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const elCenter = elRect.left + elRect.width / 2;
      const scCenter = scRect.left + scRect.width / 2;
      const delta = elCenter - scCenter;
      const maxScroll = Math.max(0, sc.scrollWidth - sc.clientWidth);
      const target = Math.min(maxScroll, Math.max(0, sc.scrollLeft + delta));

      const reduceMotion =
        typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (!animated || reduceMotion) {
        sc.scrollLeft = target;
        return;
      }

      const start = sc.scrollLeft;
      const change = target - start;
      if (Math.abs(change) < 0.5) return;

      const durationMs = 260;
      const t0 = performance.now();
      const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / durationMs);
        sc.scrollLeft = start + change * easeOutCubic(t);
        if (t < 1) {
          centerScrollRafRef.current = requestAnimationFrame(step);
        } else {
          centerScrollRafRef.current = null;
        }
      };
      centerScrollRafRef.current = requestAnimationFrame(step);
    },
    [activeIndex]
  );

  useEffect(() => {
    if (hideBottomNav || activeIndex < 0) return;

    const run = () => {
      const animated = firstLayoutDoneRef.current;
      firstLayoutDoneRef.current = true;
      scrollActiveToCenter(animated);
    };

    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(run);
    });
    return () => {
      window.cancelAnimationFrame(id);
      if (centerScrollRafRef.current !== null) {
        cancelAnimationFrame(centerScrollRafRef.current);
        centerScrollRafRef.current = null;
      }
    };
  }, [pathname, activeIndex, edgePadPx, hideBottomNav, navItems.length, scrollActiveToCenter]);

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
      <div className="ios-nav-shell relative min-h-[var(--nav-height)] w-full max-w-full overflow-hidden pt-0.5">
        <div
          ref={scrollerRef}
          className={cn(
            "flex max-w-full overflow-x-auto overflow-y-hidden",
            "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "touch-pan-x [-webkit-overflow-scrolling:touch]"
          )}
          style={{
            paddingLeft: edgePadPx,
            paddingRight: edgePadPx + FAB_RESERVE_PX,
            gap: ITEM_GAP_PX,
            scrollPaddingLeft: edgePadPx,
            scrollPaddingRight: edgePadPx + FAB_RESERVE_PX,
          }}
        >
          {navItems.map((item, index) => {
            const { icon: Icon, label, tutorialId, showUnreadBadge } = item;
            const isActive = item.isActive(pathname);
            const showBadge = !!showUnreadBadge && totalUnreadCount > 0;

            return (
              <button
                key={item.path}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                type="button"
                onClick={() => navigate(item.path)}
                data-tutorial={tutorialId}
                className={cn(
                  "flex min-h-[48px] w-[min(5.75rem,22vw)] max-w-[5.75rem] min-w-0 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl",
                  "touch-manipulation transition-transform duration-200 ease-ios active:scale-[0.96]"
                )}
              >
                <div className="relative shrink-0">
                  <Icon
                    className={cn(
                      "h-[26px] w-[26px] transition-colors duration-200 ease-ios",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                    strokeWidth={isActive ? 2.4 : 1.65}
                    aria-hidden
                  />
                  {showBadge && (
                    <span className="absolute -right-2 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-background bg-destructive px-1 text-[10px] font-bold text-destructive-foreground shadow-sm">
                      {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    "w-full truncate text-center text-[11px] leading-none tracking-tight transition-colors duration-200 ease-ios",
                    isActive ? "font-semibold text-primary" : "font-medium text-muted-foreground"
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
