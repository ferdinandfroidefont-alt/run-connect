import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFeed, type FeedSession } from "@/hooks/useFeed";
import { useDiscoverFeed, type DiscoverSession } from "@/hooks/useDiscoverFeed";
import { useGeolocation } from "@/hooks/useGeolocation";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SessionDetailsDialog } from "@/components/SessionDetailsDialog";
import { FeedEmptyState } from "@/components/feed/FeedEmptyState";
import { DiscoverEmptyState } from "@/components/feed/DiscoverEmptyState";
import { getActivityEmoji } from "@/lib/discoverSessionVisual";
import { cn } from "@/lib/utils";

type FeedMode = "friends" | "discover";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatKmLabel(km: number | null) {
  if (km == null || !Number.isFinite(km)) return "—";
  if (km < 1) return `${Math.round(km * 1000)}`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)}`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function toneHexForActivity(activityType: string): string {
  const t = (activityType ?? "").toLowerCase();
  if (t.includes("velo") || t.includes("vtt") || t.includes("bike") || t.includes("cycl") || t.includes("gravel"))
    return "#ff375f";
  if (t.includes("nat") || t.includes("swim") || t.includes("kayak") || t.includes("surf")) return "#5ac8fa";
  if (t.includes("trail") || t.includes("rando") || t.includes("marche") || t.includes("walk")) return "#34c759";
  return "#0066cc";
}

function sessionLikelyLive(scheduledAt: string) {
  const start = new Date(scheduledAt).getTime();
  const now = Date.now();
  const end = start + 3 * 60 * 60 * 1000;
  return now >= start && now <= end;
}

function shortLocation(name: string | null | undefined) {
  if (!name?.trim()) return "";
  const cut = name.split(/[,·]/)[0]?.trim();
  return cut || name;
}

/** Mini-carte abstraite — même SVG que la maquette 23 (`MiniMap` dans `apple-screens.jsx`). */
export function FeedMaquetteMiniMap({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 360 220"
      className={cn("block h-full w-full", className)}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <rect width="360" height="220" fill="#e6ecef" />
      <path
        d="M120 60 Q170 40 230 70 Q280 90 240 140 Q190 175 130 150 Q90 130 100 100 Q108 70 120 60Z"
        fill="#bbd6e6"
      />
      <path d="M0 110 Q80 100 180 120 Q260 130 360 100" stroke="#fff" strokeWidth="3" fill="none" />
      <path d="M40 30 Q80 90 180 120 Q220 140 200 200" stroke="#fff" strokeWidth="2.5" fill="none" />
      <g>
        <circle cx="100" cy="105" r="6" fill="#0066cc" />
        <circle cx="100" cy="105" r="3" fill="#fff" />
        <circle cx="180" cy="118" r="6" fill="#34c759" />
        <circle cx="180" cy="118" r="3" fill="#fff" />
        <circle cx="240" cy="100" r="6" fill="#5ac8fa" />
        <circle cx="240" cy="100" r="3" fill="#fff" />
        <circle cx="290" cy="140" r="6" fill="#ff9500" />
        <circle cx="290" cy="140" r="3" fill="#fff" />
      </g>
    </svg>
  );
}

function FeedMaquetteTile({
  who,
  when,
  title,
  sportEmoji,
  kmDisplay,
  tone,
  live,
  actionLabel,
  onCardPress,
  onActionPress,
}: {
  who: string;
  when: string;
  title: string;
  sportEmoji: string;
  kmDisplay: string;
  tone: string;
  live: boolean;
  actionLabel: string;
  onCardPress: () => void;
  onActionPress: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onCardPress}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onCardPress();
        }
      }}
      className="w-full min-w-0 cursor-pointer overflow-hidden rounded-[18px] bg-card text-left shadow-none outline-none ring-0 active:scale-[0.99] dark:bg-card"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div className="flex items-center gap-2.5 p-3.5">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
          style={{ background: tone }}
        >
          {initials(who)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold leading-tight tracking-[-0.4px] text-foreground">{who}</div>
          <div
            className={cn(
              "text-[13px] leading-snug",
              live ? "font-medium text-[#34c759]" : "text-muted-foreground",
            )}
          >
            {when}
          </div>
        </div>
        {live && <span className="h-2 w-2 shrink-0 rounded-full bg-[#34c759]" aria-hidden />}
      </div>

      <div className="relative h-[130px] w-full overflow-hidden">
        <FeedMaquetteMiniMap />
        <div className="absolute bottom-3.5 left-3.5 text-[#1d1d1f] dark:text-foreground">
          <span className="text-[22px] leading-none">{sportEmoji}</span>{" "}
          <span className="font-display text-[26px] font-bold leading-none tracking-[-0.5px]">{kmDisplay}</span>{" "}
          <span className="text-[13px] font-normal">km</span>
        </div>
      </div>

      <div
        className="flex items-center justify-between border-t p-3.5"
        style={{ borderColor: "rgba(60, 60, 67, 0.12)" }}
      >
        <div className="min-w-0 flex-1 pr-3 text-[15px] font-semibold leading-snug text-foreground">{title}</div>
        <span className="shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onActionPress(e);
            }}
            className="h-9 shrink-0 rounded-full bg-primary px-[18px] text-[15px] font-normal tracking-[-0.3px] text-primary-foreground active:scale-95"
          >
            {actionLabel}
          </button>
        </span>
      </div>
    </div>
  );
}

export function FeedActivitiesMaquette() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { position } = useGeolocation();
  const [mode, setMode] = useState<FeedMode>("friends");
  const [friendCount, setFriendCount] = useState<number | null>(null);
  const [selectedFriendsSession, setSelectedFriendsSession] = useState<Record<string, unknown> | null>(null);
  const [selectedDiscoverSession, setSelectedDiscoverSession] = useState<Record<string, unknown> | null>(null);

  const { feedItems, loading: friendsLoading, hasMore, loadMore, refresh: refreshFriends } = useFeed();

  const {
    sessions: discoverSessions,
    loading: discoverLoading,
    hasLocation,
    joinSession,
    refresh: refreshDiscover,
    resetFilters,
  } = useDiscoverFeed();

  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { count, error } = await supabase
        .from("user_follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", user.id)
        .eq("status", "accepted");
      if (!error) setFriendCount(count ?? 0);
    })();
  }, [user?.id]);

  useEffect(() => {
    if (mode !== "friends") return;
    const el = loadMoreRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !friendsLoading) loadMore();
      },
      { threshold: 0.12 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, friendsLoading, loadMore, mode]);

  const loading = mode === "friends" ? friendsLoading : discoverLoading;

  const renderFriendsWhen = useCallback((s: FeedSession) => {
    const d = new Date(s.scheduled_at);
    if (sessionLikelyLive(s.scheduled_at)) return "EN COURS · live";
    return `programme · ${format(d, "HH:mm", { locale: fr })}`;
  }, []);

  const renderDiscoverWhen = useCallback((s: DiscoverSession) => {
    const d = new Date(s.scheduled_at);
    if (sessionLikelyLive(s.scheduled_at)) return "EN COURS · live";
    const h = d.getHours();
    if (h >= 17) return `programme · ce soir ${format(d, "HH")}h`;
    return `programme · ${format(d, "HH:mm", { locale: fr })}`;
  }, []);

  const kmForFriendSession = useCallback(
    (s: FeedSession) => {
      if (!position) return null;
      return haversineKm(position.lat, position.lng, s.location_lat, s.location_lng);
    },
    [position],
  );

  const handleJoinFromFeed = useCallback(
    (sessionId: string) => {
      navigate("/", { state: { openSessionId: sessionId } });
    },
    [navigate],
  );

  const friendLabel = useMemo(() => {
    const n = friendCount ?? 0;
    return `Amis · ${n}`;
  }, [friendCount]);

  return (
    <IosFixedPageHeaderShell
      className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-x-hidden bg-secondary"
      headerWrapperClassName="shrink-0"
      contentScroll
      scrollClassName="min-h-0 bg-secondary"
      header={
        <div className="min-w-0 bg-secondary pt-[var(--safe-area-top)]">
          <div className="flex h-11 items-center px-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="-ml-1 flex h-11 min-w-[44px] items-center justify-start text-primary active:opacity-60"
              aria-label="Retour"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
            </button>
          </div>
          <div className="px-4 pb-2 pt-1">
            <h1 className="font-display text-[34px] font-bold leading-[1.05] tracking-[-0.5px] text-foreground">
              Activités
            </h1>
          </div>
          <div className="flex gap-1.5 px-4 pb-1">
            <button
              type="button"
              onClick={() => setMode("friends")}
              className={cn(
                "h-9 shrink-0 rounded-full px-[18px] text-[15px] font-normal tracking-[-0.3px] transition-transform active:scale-95",
                mode === "friends"
                  ? "bg-primary text-primary-foreground"
                  : "border border-primary bg-transparent text-primary",
              )}
            >
              {friendLabel}
            </button>
            <button
              type="button"
              onClick={() => setMode("discover")}
              className={cn(
                "h-9 shrink-0 rounded-full px-[18px] text-[15px] font-normal tracking-[-0.3px] transition-transform active:scale-95",
                mode === "discover"
                  ? "bg-primary text-primary-foreground"
                  : "border border-primary bg-transparent text-primary",
              )}
            >
              Découvrir
            </button>
          </div>
        </div>
      }
    >
      <ScrollArea className="h-full min-h-0 min-w-0 flex-1 overflow-x-hidden [&>div>div[style]]:!overflow-y-auto [&_.scrollbar]:hidden [&>div>div+div]:hidden">
        <div className="box-border w-full max-w-full space-y-3.5 px-4 pb-[6.5rem] pt-3.5" data-tutorial="tutorial-feed">
          {mode === "friends" && loading && feedItems.length === 0 ? (
            <div className="flex flex-col gap-3.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="overflow-hidden rounded-[18px] bg-card p-0 dark:bg-card">
                  <div className="flex items-center gap-2.5 p-3.5">
                    <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-4 w-1/2 animate-pulse rounded-full bg-muted" />
                      <div className="h-3 w-1/3 animate-pulse rounded-full bg-muted" />
                    </div>
                  </div>
                  <div className="h-[130px] animate-pulse bg-muted/60" />
                  <div className="flex items-center justify-between border-t border-border/50 p-3.5">
                    <div className="h-4 w-2/3 animate-pulse rounded-full bg-muted" />
                    <div className="h-9 w-24 animate-pulse rounded-full bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : mode === "friends" && feedItems.length === 0 ? (
            <div className="mx-auto max-w-md py-6">
              <FeedEmptyState />
            </div>
          ) : mode === "friends" ? (
            <>
              {feedItems.map((s) => {
                const who = s.organizer.display_name || s.organizer.username;
                const loc = shortLocation(s.location_name);
                const title = loc ? `${s.title} · ${loc}` : s.title;
                const live = sessionLikelyLive(s.scheduled_at);
                const km = kmForFriendSession(s);
                const emoji = getActivityEmoji(s.activity_type);
                const tone = toneHexForActivity(s.activity_type);
                return (
                  <FeedMaquetteTile
                    key={s.id}
                    who={who}
                    when={renderFriendsWhen(s)}
                    title={title}
                    sportEmoji={emoji}
                    kmDisplay={formatKmLabel(km)}
                    tone={tone}
                    live={live}
                    actionLabel={live ? "Suivre" : "Rejoindre"}
                    onCardPress={() =>
                      setSelectedFriendsSession({
                        ...s,
                        session_type: s.activity_type,
                        intensity: "moderate",
                        organizer_id: s.organizer.user_id,
                        profiles: {
                          username: s.organizer.username,
                          display_name: s.organizer.display_name,
                          avatar_url: s.organizer.avatar_url || undefined,
                        },
                      })
                    }
                    onActionPress={() => handleJoinFromFeed(s.id)}
                  />
                );
              })}
              {hasMore ? (
                <div ref={loadMoreRef} className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                feedItems.length > 0 && (
                  <p className="py-6 text-center text-[13px] text-muted-foreground">Vous êtes à jour !</p>
                )
              )}
            </>
          ) : loading && discoverSessions.length === 0 ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : discoverSessions.length === 0 ? (
            <div className="mx-auto max-w-md py-4">
              <DiscoverEmptyState
                hasLocation={hasLocation}
                onResetFilters={() => {
                  resetFilters();
                  void refreshDiscover();
                }}
              />
            </div>
          ) : (
            discoverSessions.map((s) => {
              const who = s.organizer.display_name || s.organizer.username;
              const loc = shortLocation(s.location_name);
              const title = loc ? `${s.title} · ${loc}` : s.title;
              const live = sessionLikelyLive(s.scheduled_at);
              const emoji = getActivityEmoji(s.activity_type);
              const tone = toneHexForActivity(s.activity_type);
              return (
                <FeedMaquetteTile
                  key={s.id}
                  who={who}
                  when={renderDiscoverWhen(s)}
                  title={title}
                  sportEmoji={emoji}
                  kmDisplay={formatKmLabel(s.distance_km)}
                  tone={tone}
                  live={live}
                  actionLabel={live ? "Suivre" : "Rejoindre"}
                  onCardPress={() =>
                    setSelectedDiscoverSession({
                      ...s,
                      session_type: s.activity_type,
                      profiles: {
                        username: s.organizer.username,
                        display_name: s.organizer.display_name,
                        avatar_url: s.organizer.avatar_url || undefined,
                      },
                    })
                  }
                  onActionPress={() => {
                    void joinSession(s);
                  }}
                />
              );
            })
          )}
        </div>
      </ScrollArea>

      <SessionDetailsDialog
        session={selectedDiscoverSession as any}
        onClose={() => setSelectedDiscoverSession(null)}
        onSessionUpdated={() => void refreshDiscover()}
      />

      <SessionDetailsDialog
        session={selectedFriendsSession as any}
        onClose={() => setSelectedFriendsSession(null)}
        onSessionUpdated={() => void refreshFriends()}
      />
    </IosFixedPageHeaderShell>
  );
}
