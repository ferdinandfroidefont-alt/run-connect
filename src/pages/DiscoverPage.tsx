import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  Users,
  RefreshCw,
  ChevronRight,
  PenTool,
  Navigation,
  Box,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useFeed } from "@/hooks/useFeed";
import { useDiscoverFeed } from "@/hooks/useDiscoverFeed";
import {
  FeedSessionTile,
  sessionLikelyLive,
  shortLocation,
  toneHexForActivity,
} from "@/components/feed/FeedSessionTile";
import { SessionDetailsDialog } from "@/components/SessionDetailsDialog";

// ─── constants ────────────────────────────────────────────────────────────────
const ACTION_BLUE = "#007AFF";
const BG = "#F2F2F7";

type Chip = "carte" | "feed" | "live" | "itineraires";

const CHIPS: { id: Chip; label: string }[] = [
  { id: "carte", label: "Carte" },
  { id: "feed", label: "Feed" },
  { id: "live", label: "Live" },
  { id: "itineraires", label: "Itinéraires" },
];

const ITI_ITEMS = [
  {
    path: "/route-create",
    title: "Créer un itinéraire",
    description: "Tracer un parcours sur la carte",
    icon: PenTool,
    color: "#007AFF",
  },
  {
    path: "/itinerary/my-routes",
    title: "Mes itinéraires",
    description: "Parcours enregistrés et actions rapides",
    icon: MapPin,
    color: "#34C759",
  },
  {
    path: "/itinerary/3d",
    title: "Mode 3D / Survol",
    description: "Visualiser un itinéraire en relief",
    icon: Box,
    color: "#5856D6",
  },
  {
    path: "/itinerary/training",
    title: "Mode entraînement",
    description: "Course ou vélo guidé sur un tracé",
    icon: Navigation,
    color: "#FF2D55",
  },
] as const;

// ─── helpers ──────────────────────────────────────────────────────────────────
function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ─── MapPin bubble (same style as maquette) ───────────────────────────────────
function MapPinDot({
  top,
  left,
  color,
}: {
  top: string;
  left: string;
  color: string;
}) {
  return (
    <div
      className="absolute w-7 h-7 rounded-full border-2 border-white flex items-center justify-center shadow-lg"
      style={{ top, left, background: color }}
    >
      <MapPin className="w-3.5 h-3.5 text-white" strokeWidth={3} fill="white" />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function DiscoverPage() {
  const navigate = useNavigate();

  // Chip / view state
  const [chip, setChip] = useState<Chip>("carte");

  // Scroll + header blur state
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  // Pull-to-refresh state
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [animated, setAnimated] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(nowHHMM);
  const startY = useRef(0);
  const pulling = useRef(false);
  const currentPull = useRef(0);

  // Session dialog
  const [selectedSession, setSelectedSession] = useState<Record<string, unknown> | null>(null);

  // Data hooks
  const {
    feedItems,
    loading: feedLoading,
    refresh: refreshFeed,
  } = useFeed();

  const {
    sessions: discoverSessions,
    loading: discoverLoading,
    joinSession,
    refresh: refreshDiscover,
  } = useDiscoverFeed();

  // ── scroll detection ─────────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 4);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // ── pull-to-refresh ──────────────────────────────────────────────────────
  const doRefresh = useCallback(async () => {
    setRefreshing(true);
    setPullY(44);
    try {
      await Promise.allSettled([refreshFeed(), refreshDiscover()]);
    } finally {
      setLastUpdate(nowHHMM());
      setRefreshing(false);
      setPullY(0);
    }
  }, [refreshFeed, refreshDiscover]);

  useEffect(() => {
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
  }, [refreshing, doRefresh]);

  const progress = Math.min(pullY / 70, 1);
  const liveSessions = discoverSessions.filter((s) =>
    sessionLikelyLive(s.scheduled_at),
  );

  return (
    <>
      {/* Scroll container — takes all available space */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain"
        style={{
          background: BG,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* ── Sticky iOS header ─────────────────────────────────────────── */}
        <div
          className="sticky top-0 z-50 transition-all duration-200 ease-out"
          style={{
            background: scrolled ? "rgba(242, 242, 247, 0.72)" : BG,
            backdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
            WebkitBackdropFilter: scrolled
              ? "blur(20px) saturate(180%)"
              : "none",
            borderBottom: scrolled
              ? "0.5px solid rgba(0, 0, 0, 0.08)"
              : "0.5px solid transparent",
            /* iOS safe-area inset at the top for notch / Dynamic Island */
            paddingTop: "env(safe-area-inset-top, 0px)",
          }}
        >
          <div className="px-5 pt-4 pb-3 flex items-center justify-between gap-3">
            <h1
              className="text-[#0A0F1F] leading-none truncate min-w-0"
              style={{
                fontSize: "44px",
                fontWeight: 900,
                letterSpacing: "-0.04em",
              }}
            >
              Découvrir
            </h1>
            <button
              type="button"
              aria-label="Rechercher"
              onClick={() => navigate("/search")}
              className="w-9 h-9 flex items-center justify-center flex-shrink-0 -mr-1"
            >
              <Search
                style={{ width: 24, height: 24, color: ACTION_BLUE }}
                strokeWidth={2.4}
              />
            </button>
          </div>
        </div>

        {/* ── Pull-to-refresh indicator ─────────────────────────────────── */}
        {/* Appears between the header and content when pulling */}
        <div
          className="overflow-hidden flex items-center justify-center"
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
              className={`w-4 h-4 text-[#8E8E93] ${refreshing ? "animate-spin" : ""}`}
              strokeWidth={2.5}
              style={{
                transform: refreshing
                  ? undefined
                  : `rotate(${pullY * 3.5}deg)`,
                transition:
                  animated && !refreshing ? "transform 0.3s ease-out" : "none",
              }}
            />
            <p className="text-[13px] text-[#8E8E93] font-medium whitespace-nowrap">
              {refreshing
                ? "Mise à jour..."
                : pullY >= 70
                  ? "Relâche pour actualiser"
                  : `Dernière mise à jour : ${lastUpdate}`}
            </p>
          </div>
        </div>

        {/* ── Page content ─────────────────────────────────────────────── */}
        <main className="px-5 pt-3 pb-8">
          {/* Chip navigation */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {CHIPS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setChip(c.id)}
                className="px-4 py-1.5 rounded-full text-[14px] font-semibold flex-shrink-0 transition-colors touch-manipulation"
                style={{
                  background: chip === c.id ? ACTION_BLUE : "white",
                  color: chip === c.id ? "white" : "#0A0F1F",
                }}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* ── CARTE ──────────────────────────────────────────────────── */}
          {chip === "carte" && (
            <>
              {/* Embedded map card (gradient matching maquette + real data overlay) */}
              <div
                className="relative h-64 rounded-2xl overflow-hidden mt-4"
                style={{
                  background:
                    "linear-gradient(135deg, #c8e6c9, #a5d6a7 50%, #81c784)",
                }}
              >
                <MapPinDot top="20%" left="30%" color="#FF3B30" />
                <MapPinDot top="45%" left="60%" color={ACTION_BLUE} />
                <MapPinDot top="65%" left="40%" color={ACTION_BLUE} />
                <MapPinDot top="30%" left="75%" color="#FF9500" />

                {/* Info bubble */}
                <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md rounded-xl p-3">
                  <p className="text-[13px] font-semibold text-[#0A0F1F]">
                    {discoverLoading
                      ? "Chargement…"
                      : `${discoverSessions.length} séance${discoverSessions.length !== 1 ? "s" : ""} autour de toi`}
                  </p>
                  {discoverSessions[0]?.location_name && (
                    <p className="text-[12px] text-[#8E8E93] mt-0.5">
                      {shortLocation(discoverSessions[0].location_name)}
                    </p>
                  )}
                </div>
              </div>

              <h2 className="text-[22px] font-bold mt-6 mb-3 text-[#0A0F1F]">
                Près de chez toi
              </h2>

              {discoverLoading && discoverSessions.length === 0 ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : discoverSessions.length === 0 ? (
                <p className="text-[15px] text-[#8E8E93] text-center py-8">
                  Aucune séance autour de toi
                </p>
              ) : (
                discoverSessions.slice(0, 6).map((s) => (
                  <div
                    key={s.id}
                    className="bg-white rounded-2xl p-3.5 mb-2.5 flex items-center gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                  >
                    <div
                      className="w-11 h-11 rounded-full flex-shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${toneHexForActivity(s.activity_type)}55, ${toneHexForActivity(s.activity_type)})`,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-bold text-[#0A0F1F] truncate">
                        {s.title}
                      </p>
                      <p className="text-[13px] text-[#8E8E93]">
                        {s.organizer.display_name || s.organizer.username} ·{" "}
                        {format(new Date(s.scheduled_at), "HH:mm", {
                          locale: fr,
                        })}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[12px] text-[#8E8E93] flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {typeof s.distance_km === "number"
                            ? `${s.distance_km.toFixed(1)} km`
                            : "—"}
                        </span>
                        <span className="text-[12px] text-[#8E8E93] flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {s.current_participants}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-full text-[13px] font-semibold text-white flex-shrink-0 touch-manipulation"
                      style={{ background: ACTION_BLUE }}
                      onClick={() =>
                        setSelectedSession({
                          ...s,
                          session_type: s.activity_type,
                          profiles: {
                            username: s.organizer.username,
                            display_name: s.organizer.display_name,
                            avatar_url: s.organizer.avatar_url,
                          },
                        })
                      }
                    >
                      Rejoindre
                    </button>
                  </div>
                ))
              )}
            </>
          )}

          {/* ── FEED ───────────────────────────────────────────────────── */}
          {chip === "feed" && (
            <div className="mt-4 space-y-3.5">
              {feedLoading && feedItems.length === 0 ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : feedItems.length === 0 ? (
                <p className="text-[15px] text-[#8E8E93] text-center py-12">
                  Aucune activité de vos amis
                </p>
              ) : (
                feedItems.map((s) => {
                  const who =
                    s.organizer.display_name || s.organizer.username;
                  const loc = shortLocation(s.location_name);
                  const title = loc ? `${s.title} · ${loc}` : s.title;
                  const live = sessionLikelyLive(s.scheduled_at);
                  const tone = toneHexForActivity(s.activity_type);
                  const when = live
                    ? "EN COURS · live"
                    : `programme · ${format(new Date(s.scheduled_at), "HH:mm", { locale: fr })}`;
                  return (
                    <FeedSessionTile
                      key={s.id}
                      who={who}
                      when={when}
                      title={title}
                      tone={tone}
                      live={live}
                      actionLabel={live ? "Suivre" : "Rejoindre"}
                      commentLabel="Commenter"
                      locationLat={s.location_lat}
                      locationLng={s.location_lng}
                      avatarUrl={s.organizer.avatar_url || undefined}
                      activityType={s.activity_type}
                      onCardPress={() =>
                        setSelectedSession({
                          ...s,
                          session_type: s.activity_type,
                          intensity: "moderate",
                          organizer_id: s.organizer.user_id,
                          profiles: {
                            username: s.organizer.username,
                            display_name: s.organizer.display_name,
                            avatar_url: s.organizer.avatar_url,
                          },
                        })
                      }
                      onActionPress={(_e) =>
                        navigate("/", {
                          state: { openSessionId: s.id },
                        })
                      }
                    />
                  );
                })
              )}
            </div>
          )}

          {/* ── LIVE ───────────────────────────────────────────────────── */}
          {chip === "live" && (
            <div className="mt-4">
              {discoverLoading && liveSessions.length === 0 ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : liveSessions.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-12 h-12 rounded-full bg-[#FF3B30]/10 flex items-center justify-center mx-auto mb-3">
                    <div className="w-3 h-3 rounded-full bg-[#FF3B30]" />
                  </div>
                  <p className="text-[15px] font-semibold text-[#0A0F1F]">
                    Aucune session en direct
                  </p>
                  <p className="text-[13px] text-[#8E8E93] mt-1">
                    Les sessions live apparaissent ici
                  </p>
                </div>
              ) : (
                liveSessions.map((s) => (
                  <div
                    key={s.id}
                    className="bg-white rounded-2xl p-3.5 mb-2.5 flex items-center gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-11 h-11 rounded-full bg-[#FF3B30]/10 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-[#FF3B30] animate-pulse" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-bold text-[#0A0F1F] truncate">
                        {s.title}
                      </p>
                      <p className="text-[13px] text-[#8E8E93]">
                        EN COURS ·{" "}
                        {s.organizer.display_name || s.organizer.username}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-full text-[13px] font-semibold text-white flex-shrink-0"
                      style={{ background: "#FF3B30" }}
                      onClick={() => void joinSession(s)}
                    >
                      Suivre
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── ITINÉRAIRES ────────────────────────────────────────────── */}
          {chip === "itineraires" && (
            <div className="mt-4">
              {/* ios-card bubble exactly like ItineraryHub */}
              <div className="bg-white rounded-2xl overflow-hidden border border-[rgba(0,0,0,0.06)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                {ITI_ITEMS.map((item, index) => (
                  <div key={item.path}>
                    <button
                      type="button"
                      onClick={() => navigate(item.path)}
                      className="flex w-full min-w-0 items-center gap-3 px-4 py-3 min-h-[56px] active:bg-[#F2F2F7] transition-colors touch-manipulation"
                    >
                      {/* Coloured icon badge */}
                      <div
                        className="w-[29px] h-[29px] rounded-[7px] flex items-center justify-center flex-shrink-0"
                        style={{ background: item.color }}
                      >
                        <item.icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <span className="block truncate text-[17px] font-medium text-[#0A0F1F]">
                          {item.title}
                        </span>
                        <span className="block truncate text-[13px] text-[#8E8E93]">
                          {item.description}
                        </span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-[#C7C7CC] flex-shrink-0" />
                    </button>
                    {index < ITI_ITEMS.length - 1 && (
                      <div className="h-px bg-[#F2F2F7] ml-[56px]" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Session details dialog */}
      <SessionDetailsDialog
        session={selectedSession as any}
        onClose={() => setSelectedSession(null)}
        onSessionUpdated={() => {
          void refreshDiscover();
          void refreshFeed();
        }}
      />
    </>
  );
}
