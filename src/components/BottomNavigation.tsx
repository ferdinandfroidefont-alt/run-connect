import { useLocation, useNavigate } from "react-router-dom";
import { Map, Calendar, MessageCircle, LayoutList, GraduationCap } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { FloatingCreateSessionButton } from "@/components/FloatingCreateSessionButton";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";

type NavItem = {
  path: string;
  icon: ComponentType<Record<string, unknown>>;
  label: string;
  tutorialId?: string;
  isActive: (pathname: string) => boolean;
  showUnreadBadge?: boolean;
};

const ITEM_GAP_PX = 10;
/** Nombre de cases visibles ; l’index central = actif (2 à gauche, 2 à droite). */
const VISIBLE_SLOTS = 5;
const CENTER_SLOT = 2;

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

export const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const { hideBottomNav } = useAppContext();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pathname = location.pathname;
  const isHome = pathname === "/";

  const navItems = useMemo<NavItem[]>(
    () => [
      {
        path: "/",
        icon: Map,
        label: t("navigation.map"),
        tutorialId: "nav-map",
        isActive: (p) => p === "/",
      },
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
        icon: LayoutList,
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

  const N = navItems.length;

  const activeIndex = useMemo(
    () => navItems.findIndex((item) => item.isActive(pathname)),
    [navItems, pathname]
  );

  /** Index utilisé pour la fenêtre circulaire (fallback accueil si route hors menu). */
  const windowCenterIndex = activeIndex >= 0 ? activeIndex : 0;

  const visibleRow = useMemo(() => {
    return Array.from({ length: VISIBLE_SLOTS }, (_, slot) => {
      const itemIdx = mod(windowCenterIndex + slot - CENTER_SLOT, N);
      return { slot, item: navItems[itemIdx], itemIdx };
    });
  }, [N, navItems, windowCenterIndex]);

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

  if (hideBottomNav) return null;

  return (
    <>
      {isHome && <FloatingCreateSessionButton />}
      {/*
        Host fixe sans fond ni bordure : une seule couche visible (capsule blur).
        Le spacer dans Layout applique --bottom-nav-offset (inclut safe-area).
      */}
      <nav
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] border-0 bg-transparent shadow-none"
        role="navigation"
        aria-label="Navigation principale"
      >
        <div
          className="pointer-events-auto box-border w-full max-w-[100vw] px-3 pb-[var(--bottom-nav-float-gap)]"
        >
          <div
            className={cn(
              "ios-tab-bar-pill mx-auto w-full max-w-lg overflow-hidden",
              "pt-2 pb-[max(0.25rem,env(safe-area-inset-bottom,0px))] pl-0.5 pr-0.5"
            )}
          >
            <div
              className="mx-auto flex min-h-[var(--nav-height)] max-w-full items-center justify-center"
              style={{
                gap: ITEM_GAP_PX,
                paddingLeft: "0.25rem",
                paddingRight: "0.25rem",
              }}
            >
              {visibleRow.map(({ slot, item }) => {
                const { icon: Icon, label, tutorialId, showUnreadBadge } = item;
                const isCenter = slot === CENTER_SLOT;
                const isActive = item.isActive(pathname);
                const showBadge = !!showUnreadBadge && totalUnreadCount > 0;

                return (
                  <button
                    key={`slot-${slot}`}
                    type="button"
                    onClick={() => navigate(item.path)}
                    data-tutorial={tutorialId}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex min-h-[48px] min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-1 rounded-2xl",
                      "touch-manipulation transition-[transform,color,opacity] duration-300 ease-ios active:scale-[0.96]",
                      !isCenter && "opacity-[0.92]"
                    )}
                  >
                    <div className="relative flex h-[26px] w-[26px] shrink-0 items-center justify-center">
                      <Icon
                        size={26}
                        className={cn(
                          "transition-colors duration-300 ease-ios",
                          isActive ? "text-primary" : "text-muted-foreground dark:text-tab-icon-inactive"
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
                        "w-full truncate text-center text-[10px] leading-none tracking-tight transition-colors duration-300 ease-ios",
                        isActive
                          ? "font-semibold text-primary"
                          : "font-medium text-muted-foreground dark:text-tab-icon-inactive"
                      )}
                    >
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};
