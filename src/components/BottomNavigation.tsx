import { useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { FloatingCreateSessionButton } from "@/components/FloatingCreateSessionButton";
import {
  DiscoverIcon,
  SessionsIcon,
  CoachingIcon,
  MessagesIcon,
  ProfileIcon,
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

const ITEM_GAP_PX = 12;

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
  const { hideBottomNav } = useAppContext();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pathname = location.pathname;
  const isHome = pathname === "/";

  /** Ordre fixe : Accueil → Mes séances → Coaching → Messages → Profil
   *  Icônes SF-style (refonte handoff) : DiscoverIcon, SessionsIcon, etc. */
  const navItems = useMemo<NavItem[]>(
    () => [
      { path: "/", icon: DiscoverIcon, label: t("navigation.home"), isActive: (p) => p === "/" },
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
      {
        path: "/profile",
        icon: ProfileIcon,
        label: "Profil",
        isActive: (p) => p === "/profile" || p.startsWith("/profile/"),
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

  /** Toujours montée : masquage visuel uniquement (pas d’animation / pas de translate). */
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

      // Fallback to current behavior if membership check fails.
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

  return (
    <nav
      className={cn(
        "fixed inset-x-0 z-[120] w-full overflow-visible",
        // Refonte Apple : blur + bord supérieur fin (apple-tabbar dans index.css)
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
      {/* FAB accueil : fixed (hors flux) — ne pas réserver de place dans la rangée pour garder la même grille que les autres pages. */}
      {isHome && <FloatingCreateSessionButton />}
      <div className="ios-nav-shell relative min-h-[var(--nav-height)] w-full max-w-full overflow-hidden pt-1 pb-0">
        <div
          className="mx-auto flex max-w-full items-stretch justify-center"
          style={{
            gap: ITEM_GAP_PX,
            paddingLeft: "0.5rem",
            paddingRight: "0.5rem",
          }}
        >
          {navItems.map((item) => {
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
                  "flex min-h-[48px] min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-[2px] rounded-xl",
                  "touch-manipulation transition-[transform,color,opacity] duration-300 ease-ios active:scale-[0.96]"
                )}
              >
                <div className="relative flex h-[26px] w-[26px] shrink-0 items-center justify-center">
                  <Icon
                    size={26}
                    className={cn(
                      "transition-colors duration-300 ease-ios",
                      // Apple iOS : icône active = system blue, inactive = ink60 (rgba(60,60,67,0.6))
                      isActive
                        ? "text-primary"
                        : "text-[rgba(60,60,67,0.6)] dark:text-[rgba(235,235,245,0.6)]"
                    )}
                    strokeWidth={isActive ? 2.2 : 1.7}
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
                    "w-full truncate text-center text-[10px] leading-none tracking-[-0.1px] transition-colors duration-300 ease-ios",
                    isActive
                      ? "font-medium text-primary"
                      : "font-medium text-[rgba(60,60,67,0.6)] dark:text-[rgba(235,235,245,0.6)]"
                  )}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
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
