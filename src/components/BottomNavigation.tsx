import { useLocation, useNavigate } from "react-router-dom";
import { Home, Calendar, MessageCircle, GraduationCap } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { FloatingCreateSessionButton } from "@/components/FloatingCreateSessionButton";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
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

type NavItem = {
  path: string;
  icon: ComponentType<Record<string, unknown>>;
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

  /** Ordre fixe : Accueil → Mes séances → Coaching → Messages */
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
        path: "/coaching",
        icon: GraduationCap,
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
        "fixed inset-x-0 z-[110] w-full overflow-visible",
        "border-t border-border bg-background shadow-[0_-6px_24px_hsl(220_14%_10%/0.07)]",
        "dark:border-[#1f1f1f] dark:bg-black dark:shadow-[0_-8px_32px_rgba(0,0,0,0.45)] dark:backdrop-blur-none",
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
      <div className="ios-nav-shell relative min-h-[var(--nav-height)] w-full max-w-full overflow-hidden pt-0.5 pb-0">
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
                  "flex min-h-[48px] min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-0.5 rounded-xl",
                  "touch-manipulation transition-[transform,color,opacity] duration-300 ease-ios active:scale-[0.96]"
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
                    "w-full truncate text-center text-[11px] leading-none tracking-tight transition-colors duration-300 ease-ios",
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
                navigate("/messages?createClub=1");
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
