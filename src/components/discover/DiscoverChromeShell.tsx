import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const ACTION_BLUE = "#007AFF";
export const DISCOVER_BG = "#F2F2F7";

export type DiscoverChromeActiveChip = "carte" | "feed" | "live" | "itineraires";

export const DISCOVER_CHIP_ROWS: { id: DiscoverChromeActiveChip; label: string }[] = [
  { id: "carte", label: "Carte" },
  { id: "feed", label: "Feed" },
  { id: "live", label: "Live" },
  { id: "itineraires", label: "Itinéraires" },
];

export function chipRoute(id: DiscoverChromeActiveChip): string {
  if (id === "carte") return "/";
  if (id === "feed") return "/feed";
  if (id === "live") return "/discover/live";
  return "/itinerary/hub";
}

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type DiscoverChromeShellProps = {
  activeChip: DiscoverChromeActiveChip;
  children: ReactNode;
  enablePullRefresh?: boolean;
  onPullRefresh?: () => Promise<void>;
  /**
   * Si défini : les pastilles appellent ce callback (ex. page d’accueil = vues inline comme la maquette).
   * Sinon : navigation vers /feed, /discover/live, etc.
   */
  onChipPress?: (id: DiscoverChromeActiveChip) => void;
};

/**
 * Header + pastilles Découvrir identiques à la maquette ; scroll interne commun.
 */
export function DiscoverChromeShell({
  activeChip,
  children,
  enablePullRefresh = false,
  onPullRefresh,
  onChipPress,
}: DiscoverChromeShellProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      });
  }, [user]);

  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [animated, setAnimated] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(nowHHMM);
  const startY = useRef(0);
  const pulling = useRef(false);
  const currentPull = useRef(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 4);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = 0;
    setScrolled(false);
  }, [activeChip]);

  const doRefresh = useCallback(async () => {
    setRefreshing(true);
    setPullY(44);
    try {
      if (onPullRefresh) await onPullRefresh();
      else await new Promise((r) => setTimeout(r, 800));
    } finally {
      setLastUpdate(nowHHMM());
      setRefreshing(false);
      setPullY(0);
    }
  }, [onPullRefresh]);

  useEffect(() => {
    if (!enablePullRefresh) return;
    const el = scrollRef.current;
    if (!el) return;

    const begin = (clientY: number) => {
      if (el.scrollTop <= 0 && !refreshing) {
        startY.current = clientY;
        pulling.current = true;
        setAnimated(false);
      }
    };
    const move = (clientY: number, preventDefault?: () => void) => {
      if (!pulling.current) return;
      const delta = clientY - startY.current;
      if (delta > 0) {
        preventDefault?.();
        const resisted = Math.min(delta * 0.55, 110);
        currentPull.current = resisted;
        setPullY(resisted);
      } else {
        pulling.current = false;
        setPullY(0);
      }
    };
    const end = () => {
      if (!pulling.current) return;
      pulling.current = false;
      setAnimated(true);
      if (currentPull.current >= 70) void doRefresh();
      else setPullY(0);
    };

    const onTouchStart = (e: TouchEvent) => begin(e.touches[0].clientY);
    const onTouchMove = (e: TouchEvent) =>
      move(e.touches[0].clientY, () => e.preventDefault());
    const onTouchEnd = () => end();

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [enablePullRefresh, refreshing, doRefresh]);

  const progress = Math.min(pullY / 70, 1);

  const goChip = (id: DiscoverChromeActiveChip) => {
    if (id === activeChip) return;
    if (onChipPress) {
      onChipPress(id);
      return;
    }
    navigate(chipRoute(id));
  };

  return (
    <div
      ref={scrollRef}
      className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain"
      style={{
        background: DISCOVER_BG,
        WebkitOverflowScrolling: "touch",
      }}
    >
      <div
        className="sticky top-0 z-50 transition-all duration-200 ease-out"
        style={{
          background: scrolled ? "rgba(242, 242, 247, 0.72)" : DISCOVER_BG,
          backdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
          borderBottom: scrolled ? "0.5px solid rgba(0, 0, 0, 0.08)" : "0.5px solid transparent",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
          <h1
            className="min-w-0 truncate leading-none text-[#0A0F1F]"
            style={{
              fontSize: "44px",
              fontWeight: 900,
              letterSpacing: "-0.04em",
            }}
          >
            Découvrir
          </h1>
          <div className="flex flex-shrink-0 items-center gap-3">
            <button
              type="button"
              aria-label="Rechercher"
              onClick={() => navigate("/search")}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center"
            >
              <Search style={{ width: 24, height: 24, color: ACTION_BLUE }} strokeWidth={2.4} />
            </button>
            <button
              type="button"
              aria-label="Mon profil"
              onClick={() => navigate("/profile")}
              className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full border-2 border-[#E5E5EA]"
              style={
                avatarUrl
                  ? undefined
                  : { background: "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)" }
              }
            >
              {avatarUrl && (
                <img
                  src={avatarUrl}
                  alt="Profil"
                  className="h-full w-full object-cover"
                />
              )}
            </button>
          </div>
        </div>
      </div>

      {enablePullRefresh ? (
        <div
          className="flex items-center justify-center overflow-hidden"
          style={{
            height: `${pullY}px`,
            transition: animated ? "height 0.3s ease-out" : "none",
          }}
        >
          <div
            className="flex items-center gap-2 px-5"
            style={{
              opacity: refreshing ? 1 : progress,
              transform: `scale(${0.7 + progress * 0.3})`,
              transition: animated ? "all 0.3s ease-out" : "none",
            }}
          >
            <RefreshCw
              className={`h-4 w-4 text-[#8E8E93] ${refreshing ? "animate-spin" : ""}`}
              strokeWidth={2.5}
              style={{
                transform: refreshing ? undefined : `rotate(${pullY * 3.5}deg)`,
                transition: animated && !refreshing ? "transform 0.3s ease-out" : "none",
              }}
            />
            <p className="whitespace-nowrap text-[13px] font-medium text-[#8E8E93]">
              {refreshing
                ? "Mise à jour..."
                : pullY >= 70
                  ? "Relâche pour actualiser"
                  : `Dernière mise à jour : ${lastUpdate}`}
            </p>
          </div>
        </div>
      ) : null}

      <div className="px-5 pt-3 pb-8">
        <div className="-mx-5 flex gap-2 overflow-x-auto pb-1 px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {DISCOVER_CHIP_ROWS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => goChip(c.id)}
              className="flex-shrink-0 touch-manipulation rounded-full px-4 py-1.5 text-[14px] font-semibold transition-colors"
              style={{
                background: activeChip === c.id ? ACTION_BLUE : "white",
                color: activeChip === c.id ? "white" : "#0A0F1F",
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}
