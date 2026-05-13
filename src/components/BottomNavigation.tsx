import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  Clock,
  Compass,
  MessageCircle,
  Plus,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Maquette RunConnect.jsx ACTION_BLUE (#007AFF) */
const LIGHT_ACTION_BLUE = "#007AFF";
const LIGHT_LABEL_GRAY = "#8E8E93";

const TAB_BAR_LIGHT: CSSProperties = {
  background: "rgba(242, 242, 247, 0.92)",
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  borderTop: "1px solid rgba(0, 0, 0, 0.06)",
};

const TAB_BAR_DARK: CSSProperties = {
  background: "rgba(28, 28, 30, 0.92)",
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  borderTop: "1px solid rgba(84, 84, 88, 0.65)",
};

type NavItem = {
  path: string;
  icon: LucideIcon;
  label: string;
  tutorialId?: string;
  isActive: (pathname: string) => boolean;
  showUnreadBadge?: boolean;
};

type BottomNavigationProps = {
  /** Route profil : tab bar masquée visuellement (overlay plein écran) sans démontage. */
  isProfileRoute?: boolean;
};

export const BottomNavigation = ({ isProfileRoute = false }: BottomNavigationProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { resolvedTheme } = useTheme();
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [showNoClubDialog, setShowNoClubDialog] = useState(false);
  const { hideBottomNav, openCreateSession } = useAppContext();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pathname = location.pathname;
  const isDark = resolvedTheme === "dark";
  const activeBlue = isDark ? "#0A84FF" : LIGHT_ACTION_BLUE;
  const inactiveGray = isDark ? "rgba(235, 235, 245, 0.55)" : LIGHT_LABEL_GRAY;
  const tabBarSurface = isDark ? TAB_BAR_DARK : TAB_BAR_LIGHT;

  /** Icônes Lucide identiques à la maquette (Compass, CalendarDays, Clock, MessageCircle). */
  const navItems = useMemo<NavItem[]>(
    () => [
      {
        path: "/",
        icon: Compass,
        label: t("navigation.home"),
        isActive: (p) =>
          p === "/" || p === "/feed" || p === "/discover/live" || p === "/itinerary/hub",
      },
      {
        path: "/my-sessions",
        icon: CalendarDays,
        label: t("navigation.mySessions"),
        tutorialId: "nav-sessions",
        isActive: (p) => p === "/my-sessions" || p.startsWith("/my-sessions/"),
      },
      {
        path: "/coaching",
        icon: Clock,
        label: t("navigation.coaching"),
        isActive: (p) => p === "/coaching" || p.startsWith("/coaching/"),
      },
      {
        path: "/messages",
        icon: MessageCircle,
        label: t("navigation.messages"),
        tutorialId: "nav-messages",
        isActive: (p) => p === "/messages" || p.startsWith("/messages/"),
        showUnreadBadge: true,
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

  const tabBarHidden = hideBottomNav || isProfileRoute;

  const handleNavClick = async (path: string) => {
    if (path === "/messages") {
      navigate("/messages", { state: { resetConversation: true, fromBottomTab: true, ts: Date.now() } });
      return;
    }
    if (path === "/coaching" && user) {
      const { data: memberships, error } = await supabase
        .from("group_members")
        .select("conversation_id")
        .eq("user_id", user.id)
        .limit(1);

      if (error) {
        navigate(path);
        return;
      }

      if (!memberships?.length) {
        setShowNoClubDialog(true);
        return;
      }
    }
    navigate(path);
  };

  const handlePlusClick = () => {
    if (pathname !== "/") {
      navigate("/");
      window.setTimeout(() => openCreateSession(), 100);
    } else {
      openCreateSession();
    }
  };

  const leftItems = navItems.slice(0, 2);
  const rightItems = navItems.slice(2);

  const renderNavButton = (item: NavItem) => {
    const Icon = item.icon;
    const { label, tutorialId, showUnreadBadge } = item;
    const active = item.isActive(pathname);
    const showBadge = !!showUnreadBadge && totalUnreadCount > 0;

    /** NavButton maquette : flex flex-col gap-0.5 flex-1 py-1 ; pas active:scale sur les tabs. */
    const color = active ? activeBlue : inactiveGray;

    return (
      <button
        key={item.path}
        type="button"
        onClick={() => handleNavClick(item.path)}
        data-tutorial={tutorialId}
        aria-current={active ? "page" : undefined}
        className="flex min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 py-1"
      >
        <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
          <Icon
            aria-hidden
            className="h-6 w-6 shrink-0"
            color={color}
            strokeWidth={active ? 2.4 : 2}
          />
          {showBadge && (
            <span className="absolute -right-2 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#FF3B30] px-1 text-[11px] font-bold text-white">
              {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
            </span>
          )}
        </span>
        <span className="w-full px-px text-center text-[10px] font-medium leading-none" style={{ color }}>
          {label}
        </span>
      </button>
    );
  };

  /** Colonne FAB — maquette : bleu #007AFF ; sombre : #0A84FF (système iOS). */
  const fabBlue = isDark ? "#0A84FF" : LIGHT_ACTION_BLUE;

  return (
    <Fragment>
      <nav
        className={cn(
          "fixed inset-x-0 z-[120] flex w-full min-h-[var(--nav-height)] shrink-0 items-stretch justify-around overflow-visible",
          tabBarHidden ? "pointer-events-none invisible" : "pointer-events-auto",
          "[transition:none] motion-reduce:transition-none"
        )}
        role="navigation"
        aria-label="Navigation principale"
        aria-hidden={tabBarHidden}
        style={{
          ...tabBarSurface,
          bottom: 0,
          paddingTop: 8,
          paddingBottom: "calc(8px + var(--tab-bar-ground-strip))",
          transition: "none",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", ui-sans-serif, system-ui, sans-serif',
        }}
      >
        {leftItems.map(renderNavButton)}

        <div className="relative flex flex-1 items-center justify-center">
          <button
            type="button"
            onClick={handlePlusClick}
            aria-label={t("navigation.scheduleSession")}
            className="-mt-5 flex h-14 w-14 shrink-0 touch-manipulation items-center justify-center rounded-full shadow-lg transition-transform active:scale-95"
            style={{
              background: fabBlue,
              boxShadow: isDark
                ? "0 4px 12px rgba(10, 132, 255, 0.45)"
                : "0 4px 12px rgba(0, 122, 255, 0.35)",
            }}
            data-tutorial="create-session"
          >
            <Plus className="h-7 w-7 text-white" strokeWidth={3} aria-hidden />
          </button>
        </div>

        {rightItems.map(renderNavButton)}
      </nav>

      <AlertDialog open={showNoClubDialog} onOpenChange={setShowNoClubDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vous n&apos;êtes pas dans un club</AlertDialogTitle>
            <AlertDialogDescription>
              Pour accéder à l&apos;espace Coaching, vous devez d&apos;abord créer un club ou rejoindre un club existant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Plus tard</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowNoClubDialog(false);
                navigate("/search?tab=clubs");
              }}
            >
              Rechercher un club
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => {
                setShowNoClubDialog(false);
                navigate("/messages?tab=create-club");
              }}
            >
              Créer un club
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Fragment>
  );
};
