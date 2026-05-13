import { useLocation, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  DiscoverIcon,
  SessionsIcon,
  CoachingIcon,
  MessagesIcon,
} from "@/components/apple/TabIcons";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type SVGProps } from "react";
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

type TabIconProps = SVGProps<SVGSVGElement> & { size?: number };

type NavItem = {
  path: string;
  icon: ComponentType<TabIconProps>;
  label: string;
  tutorialId?: string;
  isActive: (pathname: string) => boolean;
  showUnreadBadge?: boolean;
};

/** Maquette RunConnect.jsx — tokens visibles (identique DiscoverChromeShell) */
const ACTION_BLUE = "#007AFF";

type BottomNavigationProps = {
  /** Route profil : tab bar masquée visuellement (overlay plein écran) sans démontage. */
  isProfileRoute?: boolean;
};

export const BottomNavigation = ({ isProfileRoute = false }: BottomNavigationProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [showNoClubDialog, setShowNoClubDialog] = useState(false);
  const { hideBottomNav, openCreateSession } = useAppContext();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pathname = location.pathname;

  /** Ordre fixe : Accueil → Mes séances | [+] | Coaching → Messages
   *  Icônes SF-style (refonte handoff) : DiscoverIcon, SessionsIcon, etc. */
  const navItems = useMemo<NavItem[]>(
    () => [
      {
        path: "/",
        icon: DiscoverIcon,
        label: t("navigation.home"),
        isActive: (p) =>
          p === "/" || p === "/feed" || p === "/discover/live" || p === "/itinerary/hub",
      },
      {
        path: "/my-sessions",
        icon: SessionsIcon,
        label: t("navigation.mySessions"),
        tutorialId: "nav-sessions",
        isActive: (p) => p === "/my-sessions" || p.startsWith("/my-sessions/"),
      },
      {
        path: "/coaching",
        icon: CoachingIcon,
        label: t("navigation.coaching"),
        isActive: (p) => p === "/coaching" || p.startsWith("/coaching/"),
      },
      {
        path: "/messages",
        icon: MessagesIcon,
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

  /** Toujours montée : masquage visuel uniquement (pas d'animation / pas de translate). */
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
    const { icon: Icon, label, tutorialId, showUnreadBadge } = item;
    const isActive = item.isActive(pathname);
    const showBadge = !!showUnreadBadge && totalUnreadCount > 0;

    return (
      <button
        key={item.path}
        type="button"
        onClick={() => handleNavClick(item.path)}
        data-tutorial={tutorialId}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 py-1",
          "touch-manipulation transition-[transform,color,opacity] duration-200 ease-ios active:scale-95 active:opacity-95"
        )}
      >
        <div className="relative flex h-6 w-6 shrink-0 items-center justify-center">
          <Icon
            size={24}
            className={cn(
              "transition-colors duration-200 ease-ios",
              isActive
                ? "text-[#007AFF] dark:text-[#0A84FF]"
                : "text-[#8E8E93] dark:text-[rgba(235,235,245,0.6)]"
            )}
            strokeWidth={isActive ? 2.4 : 2}
            aria-hidden
          />
          {showBadge && (
            <span className="absolute -right-2 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#FF3B30] px-1 text-[11px] font-bold text-white">
              {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
            </span>
          )}
        </div>
        <span
          className={cn(
            "w-full truncate text-center text-[10px] font-medium leading-none transition-colors duration-200 ease-ios",
            isActive
              ? "text-[#007AFF] dark:text-[#0A84FF]"
              : "text-[#8E8E93] dark:text-[rgba(235,235,245,0.6)]"
          )}
        >
          {label}
        </span>
      </button>
    );
  };

  return (
    <nav
      className={cn(
        "fixed inset-x-0 z-[120] w-full overflow-visible",
        "apple-tabbar",
        tabBarHidden ? "pointer-events-none invisible" : "pointer-events-auto",
        "[transition:none] motion-reduce:transition-none"
      )}
      role="navigation"
      aria-label="Navigation principale"
      aria-hidden={tabBarHidden}
      style={{
        paddingBottom: "var(--tab-bar-ground-strip)",
        bottom: 0,
        transition: "none",
      }}
    >
      {/* Pas de ios-nav-shell ici : il masquait le verre `.apple-tabbar` avec un fond thème opaque. */}
      <div
        className="relative mx-auto flex min-h-[var(--nav-height)] w-full max-w-full items-stretch justify-around overflow-visible px-2"
        style={{ paddingTop: 8, paddingBottom: 8 }}
      >
        {leftItems.map(renderNavButton)}

        {/* Maquette : colonne centrale + bouton surélevé (-mt-5), #007AFF + glow */}
        <div className="relative flex min-w-0 flex-1 items-center justify-center">
          <button
            type="button"
            onClick={handlePlusClick}
            aria-label="Planifier une séance"
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-full",
              "-mt-5 shadow-lg",
              "touch-manipulation transition-transform duration-200 ease-ios active:scale-95"
            )}
            style={{
              background: ACTION_BLUE,
              boxShadow: "0 4px 12px rgba(0, 122, 255, 0.35)",
            }}
          >
            <Plus className="h-7 w-7 text-white" strokeWidth={3} aria-hidden />
          </button>
        </div>

        {rightItems.map(renderNavButton)}
      </div>
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
    </nav>
  );
};
