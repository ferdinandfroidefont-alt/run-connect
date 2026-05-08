import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Calendar, ChevronLeft, ChevronRight, Clock, Expand, Minimize2, Navigation, Search, Users } from "lucide-react";
import type { Map as MapboxMap, Marker } from "mapbox-gl";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { createEmbeddedMapboxMap } from "@/lib/mapboxEmbed";
import { loadMapboxGl } from "@/lib/mapboxLazy";
import { useSessionTracking } from "@/hooks/useSessionTracking";
import { useAuth } from "@/hooks/useAuth";
import { createSessionPinButton, resolveSessionPinVariant } from "@/lib/mapSessionPin";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Badge } from "@/components/ui/badge";
import { ActivityIcon } from "@/lib/activityIcons";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import { IosPageHeaderBar } from "@/components/layout/IosPageHeaderBar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { setLiveShareOptIn } from "@/lib/liveTrackingStorage";
import { haversineMeters, formatDistanceLabel } from "@/lib/geo";
import { useDistanceUnits } from "@/contexts/DistanceUnitsContext";

type Participant = {
  id: string;
  name: string;
  avatar: string | null;
  lat: number;
  lng: number;
  active: boolean;
};

type LngLatPoint = { lat: number; lng: number };

const FALLBACK_POINT: LngLatPoint = { lat: 48.8668, lng: 2.3339 };
const PARTICIPANTS_USER_ZOOM = 12;
type LiveSessionRow = {
  id: string;
  title: string;
  scheduled_at: string;
  activity_type: string | null;
  current_participants: number | null;
  live_tracking_max_duration: number | null;
};

function isValidLngLat(value: Partial<LngLatPoint> | null | undefined): value is LngLatPoint {
  const lat = Number(value?.lat);
  const lng = Number(value?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function normalizeLngLat(value: Partial<LngLatPoint> | null | undefined, fallback: LngLatPoint = FALLBACK_POINT): LngLatPoint {
  if (isValidLngLat(value)) {
    return { lat: Number(value.lat), lng: Number(value.lng) };
  }
  return fallback;
}

function safeMapResize(map: MapboxMap | null) {
  if (!map) return;
  try {
    const container = map.getContainer();
    const rect = container?.getBoundingClientRect();
    if (!rect || rect.width < 8 || rect.height < 8) return;
    map.resize();
  } catch {
    // Ignore transient Mapbox resize failures during style/init transitions.
  }
}

function hasUsableSize(el: HTMLElement | null | undefined) {
  const rect = el?.getBoundingClientRect();
  return !!rect && rect.width >= 8 && rect.height >= 8;
}

function waitForUsableSize(el: HTMLElement): Promise<void> {
  if (hasUsableSize(el)) return Promise.resolve();
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const tick = () => {
      if (hasUsableSize(el) || Date.now() - startedAt > 1500) {
        resolve();
        return;
      }
      window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  });
}

function createParticipantMarkerEl(avatar: string, active: boolean): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "relative h-11 w-11 rounded-full border-[2.5px] border-white shadow-[0_10px_20px_-12px_rgba(0,0,0,0.8)]";
  el.style.backgroundImage = `url(${avatar})`;
  el.style.backgroundSize = "cover";
  el.style.backgroundPosition = "center";
  el.style.backgroundColor = "#f3f4f6";

  const dot = document.createElement("span");
  dot.className = "absolute -bottom-[2px] -right-[2px] h-3.5 w-3.5 rounded-full border-2 border-white";
  dot.style.background = active ? "#34C759" : "#FF9500";
  el.appendChild(dot);
  return el;
}

export default function Participants() {
  const navigate = useNavigate();
  const { user, session: authSession } = useAuth();
  const { unit } = useDistanceUnits();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("sessionId") ?? undefined;
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [sessionsSearch, setSessionsSearch] = useState("");
  const [showLiveSessionsPanel, setShowLiveSessionsPanel] = useState(false);
  const [liveSessions, setLiveSessions] = useState<LiveSessionRow[]>([]);
  const [liveSessionsFilter, setLiveSessionsFilter] = useState<"live" | "upcoming" | "recent">("live");
  const [fallbackUserPosition, setFallbackUserPosition] = useState<LngLatPoint | null>(null);
  const { getCurrentPosition } = useGeolocation();
  const {
    session,
    participantPositions,
    participantProfiles,
    userPosition,
    sessionAllowsLive,
    inLiveWindow,
    sharingOptIn,
  } = useSessionTracking(sessionId);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapFrameRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const userMarkerRef = useRef<Marker | null>(null);
  const rdvMarkerRef = useRef<Marker | null>(null);
  const participantMarkersRef = useRef<Map<string, Marker>>(new Map());
  const hasInitialCenteredRef = useRef(false);
  const effectiveUserPosition = isValidLngLat(userPosition)
    ? userPosition
    : isValidLngLat(fallbackUserPosition)
      ? fallbackUserPosition
      : null;
  const userPositionRef = useRef<LngLatPoint>(normalizeLngLat(effectiveUserPosition));

  useEffect(() => {
    userPositionRef.current = normalizeLngLat(effectiveUserPosition);
  }, [effectiveUserPosition]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const pos = await getCurrentPosition(0, { mode: "fast" });
        if (cancelled || !isValidLngLat(pos)) return;
        setFallbackUserPosition({ lat: pos.lat, lng: pos.lng });
      } catch {
        if (!cancelled) setFallbackUserPosition(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getCurrentPosition, userPosition?.lat, userPosition?.lng]);

  const participants = useMemo<Participant[]>(() => {
    const rows: Participant[] = [];
    for (const [id, pos] of participantPositions.entries()) {
      const lat = Number(pos.lat);
      const lng = Number(pos.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        continue;
      }
      rows.push({
        id,
        name: pos.display_name || pos.username || "Participant",
        avatar: pos.avatar_url,
        lat,
        lng,
        active: true,
      });
    }
    return rows;
  }, [participantPositions]);

  const computedLiveState = useMemo<"none" | "upcoming" | "live">(() => {
    if (!session || !sessionAllowsLive) return "none";
    if (!inLiveWindow) return "upcoming";
    return "live";
  }, [session, sessionAllowsLive, inLiveWindow]);

  const fitDefaultView = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const rect = map.getContainer()?.getBoundingClientRect();
    if (!rect || rect.width < 8 || rect.height < 8) return;
    const center = normalizeLngLat(userPositionRef.current);
    map.jumpTo({
      center: [center.lng, center.lat],
      zoom: PARTICIPANTS_USER_ZOOM,
    });
  }, []);

  useEffect(() => {
    if (!effectiveUserPosition) {
      hasInitialCenteredRef.current = false;
      return;
    }
    if (!mapReady || hasInitialCenteredRef.current) return;
    fitDefaultView();
    hasInitialCenteredRef.current = true;
  }, [effectiveUserPosition, fitDefaultView, mapReady]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    let cancelled = false;
    const participantMarkers = participantMarkersRef.current;
    const container = mapContainerRef.current;

    const bootMap = async () => {
      try {
        await waitForUsableSize(container);
        if (cancelled) return;

        const map = await createEmbeddedMapboxMap(container, {
          center: normalizeLngLat(userPositionRef.current),
          zoom: PARTICIPANTS_USER_ZOOM,
          interactive: true,
        });
        if (cancelled) {
          map.remove();
          return;
        }
        mapRef.current = map;

        const onReady = () => {
          if (cancelled) return;
          setMapReady(true);
          window.requestAnimationFrame(() => {
            safeMapResize(mapRef.current);
          });
        };
        if (map.isStyleLoaded()) onReady();
        else map.once("load", onReady);
      } catch {
        window.setTimeout(() => {
          if (!cancelled && !mapRef.current) void bootMap();
        }, 240);
      }
    };

    void bootMap();

    return () => {
      cancelled = true;
      setMapReady(false);
      userMarkerRef.current?.remove();
      rdvMarkerRef.current?.remove();
      participantMarkers.forEach((m) => m.remove());
      participantMarkers.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [fitDefaultView]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        safeMapResize(mapRef.current);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;
    const myProfile = user?.id ? participantProfiles.get(user.id) : null;
    const myAvatarUrl =
      myProfile?.avatar_url ??
      (typeof user?.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null) ??
      null;
    const currentUserPosition = effectiveUserPosition;

    if (currentUserPosition) {
      void (async () => {
        const mapboxgl = await loadMapboxGl();
        if (cancelled || !mapRef.current) {
          return;
        }
        const existing = userMarkerRef.current;
        if (existing) {
          existing.setLngLat([currentUserPosition.lng, currentUserPosition.lat]);
          return;
        }

        const wrap = document.createElement("div");
        wrap.style.position = "relative";
        wrap.style.width = "1px";
        wrap.style.height = "1px";
        wrap.style.overflow = "visible";

        try {
          const myPin = createSessionPinButton({
            avatarUrl: myAvatarUrl || "/placeholder.svg",
            ariaLabel: "Ma position",
            variant: resolveSessionPinVariant(),
          });
          wrap.appendChild(myPin);
        } catch {
          const fallback = document.createElement("div");
          fallback.style.width = "18px";
          fallback.style.height = "18px";
          fallback.style.borderRadius = "999px";
          fallback.style.background = "#0A84FF";
          fallback.style.border = "2px solid #fff";
          fallback.style.boxShadow = "0 4px 10px rgba(0,0,0,0.25)";
          wrap.style.width = "18px";
          wrap.style.height = "18px";
          wrap.appendChild(fallback);
        }

        const marker = new mapboxgl.Marker({ element: wrap, anchor: "bottom" })
          .setLngLat([currentUserPosition.lng, currentUserPosition.lat])
          .addTo(mapRef.current);
        userMarkerRef.current = marker;
      })();
    } else {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
    }

    const sessionLat = Number(session?.location_lat);
    const sessionLng = Number(session?.location_lng);
    const hasValidSessionPoint = Number.isFinite(sessionLat) && Number.isFinite(sessionLng);

    if (session && hasValidSessionPoint) {
      if (rdvMarkerRef.current) {
        rdvMarkerRef.current.setLngLat([sessionLng, sessionLat]);
      }
    }

    if (session && hasValidSessionPoint && !rdvMarkerRef.current) {
      const rdvEl = document.createElement("div");
      rdvEl.className =
        "h-5 w-5 rounded-full border-2 border-white bg-[#FF3B30] shadow-[0_6px_14px_-8px_rgba(0,0,0,0.7)]";
      void (async () => {
        const mapboxgl = await loadMapboxGl();
        if (cancelled || !mapRef.current || rdvMarkerRef.current) return;
        rdvMarkerRef.current = new mapboxgl.Marker({ element: rdvEl, anchor: "bottom" })
          .setLngLat([sessionLng, sessionLat])
          .addTo(mapRef.current);
      })();
    }
    if (!session || !hasValidSessionPoint) {
      rdvMarkerRef.current?.remove();
      rdvMarkerRef.current = null;
    }

    return () => {
      cancelled = true;
    };
  }, [session, effectiveUserPosition, participantProfiles, user]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;
    const participantMarkers = participantMarkersRef.current;

    if (computedLiveState !== "live") {
      participantMarkers.forEach((m) => m.remove());
      participantMarkers.clear();
      return;
    }

    void (async () => {
      const mapboxgl = await loadMapboxGl();
      if (cancelled || !mapRef.current) return;

      const seen = new Set<string>();
      for (const p of participants) {
        if (p.id === user?.id) continue;
        seen.add(p.id);
        const existing = participantMarkers.get(p.id);
        if (existing) {
          existing.setLngLat([p.lng, p.lat]);
          continue;
        }
        const avatar = p.avatar ?? "";
        const marker = new mapboxgl.Marker({
          element: createParticipantMarkerEl(avatar, p.active),
          anchor: "center",
        })
          .setLngLat([p.lng, p.lat])
          .addTo(mapRef.current);
        participantMarkers.set(p.id, marker);
      }

      for (const [id, marker] of participantMarkers.entries()) {
        if (!seen.has(id)) {
          marker.remove();
          participantMarkers.delete(id);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [participants, computedLiveState, user?.id]);

  useEffect(() => {
    if (!showLiveSessionsPanel || !authSession?.user?.id) return;
    let cancelled = false;
    void (async () => {
      const userId = authSession.user.id;
      const { data: participations } = await supabase
        .from("session_participants")
        .select("session_id")
        .eq("user_id", userId)
        .limit(200);

      const joinedSessionIds = (participations ?? []).map((row) => row.session_id).filter(Boolean);

      const [createdRes, joinedRes] = await Promise.all([
        supabase
          .from("sessions")
          .select("id, title, scheduled_at, activity_type, current_participants, live_tracking_max_duration")
          .eq("live_tracking_enabled", true)
          .eq("organizer_id", userId)
          .order("scheduled_at", { ascending: true })
          .limit(120),
        joinedSessionIds.length > 0
          ? supabase
              .from("sessions")
              .select("id, title, scheduled_at, activity_type, current_participants, live_tracking_max_duration")
              .eq("live_tracking_enabled", true)
              .in("id", joinedSessionIds)
              .order("scheduled_at", { ascending: true })
              .limit(120)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const merged = new Map<string, LiveSessionRow>();
      for (const row of [...(createdRes.data ?? []), ...((joinedRes.data as LiveSessionRow[] | null) ?? [])]) {
        merged.set(row.id, row);
      }

      const sorted = Array.from(merged.values()).sort(
        (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      );

      if (createdRes.error || joinedRes.error) return;
      if (cancelled) return;
      setLiveSessions(sorted);
    })();
    return () => {
      cancelled = true;
    };
  }, [showLiveSessionsPanel, authSession?.user?.id]);

  const otherParticipantsSorted = useMemo(() => {
    const me = effectiveUserPosition;
    const others = participants.filter((p) => p.id !== user?.id);
    const withDist = others.map((p) => ({
      participant: p,
      distM: me ? haversineMeters(me.lat, me.lng, p.lat, p.lng) : Number.NaN,
    }));
    withDist.sort((a, b) => {
      const da = Number.isFinite(a.distM) ? a.distM : Number.POSITIVE_INFINITY;
      const db = Number.isFinite(b.distM) ? b.distM : Number.POSITIVE_INFINITY;
      return da - db;
    });
    return withDist;
  }, [participants, user?.id, effectiveUserPosition]);

  const filteredLiveSessions = useMemo(() => {
    const now = Date.now();
    const byFilter = liveSessions.filter((s) => {
      const t = new Date(s.scheduled_at).getTime();
      const liveWindowMs = Math.max(15, Number(s.live_tracking_max_duration) || 120) * 60 * 1000;
      if (liveSessionsFilter === "live") return t <= now && now <= t + liveWindowMs;
      if (liveSessionsFilter === "upcoming") return t > now;
      return t + liveWindowMs < now;
    });

    const q = sessionsSearch.trim().toLowerCase();
    if (!q) return byFilter;
    return byFilter.filter((s) => (s.title || "Séance").toLowerCase().includes(q));
  }, [liveSessions, sessionsSearch, liveSessionsFilter]);

  const centerOnParticipant = useCallback((participantId: string) => {
    const map = mapRef.current;
    if (!map) return;
    const row = participants.find((p) => p.id === participantId);
    if (!row) return;
    map.easeTo({
      center: [row.lng, row.lat],
      zoom: Math.max(15.2, map.getZoom()),
      duration: 420,
      essential: true,
    });
  }, [participants]);

  const toggleMapFullscreen = useCallback(async () => {
    const el = mapFrameRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const onFs = () => setIsMapFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const container = mapContainerRef.current;
    if (!map || !container || !mapReady) return;
    const ro = new ResizeObserver(() => {
      safeMapResize(map);
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [mapReady]);

  return (
    <div className="relative flex h-[100dvh] min-h-0 min-w-0 flex-col overflow-hidden bg-secondary">
      <IosFixedPageHeaderShell
        className="flex h-full min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-x-hidden bg-secondary"
        headerWrapperClassName="shrink-0 bg-card"
        contentScroll
        scrollClassName="min-h-0 bg-secondary"
        header={
          <div className="min-w-0 border-b border-border bg-card/95 pt-[var(--safe-area-top)]">
            <IosPageHeaderBar
              leadingBack={{ onClick: () => navigate("/"), label: "Découvrir" }}
              title="Suivi"
              sideClassName="w-[7.5rem]"
            />
          </div>
        }
      >
        <ScrollArea className="h-full min-h-0 min-w-0 flex-1 overflow-x-hidden [&>div>div[style]]:!overflow-y-auto [&_.scrollbar]:hidden [&>div>div+div]:hidden">
          <div className="min-w-0 max-w-full space-y-3 px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-3 ios-shell:px-2.5">
            <div
              className="rounded-[14px] p-1 shadow-[0_0_0_0.5px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_0.5px_rgba(255,255,255,0.08)]"
              style={{ background: "hsl(var(--card))" }}
            >
              <button
                type="button"
                onClick={() => setShowLiveSessionsPanel(true)}
                className="min-w-0 w-full rounded-lg bg-background py-[10px] text-center text-[13px] font-semibold text-foreground shadow-[0_0_0_0.5px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] transition-colors active:opacity-90 dark:shadow-[0_0_0_0.5px_rgba(255,255,255,0.08),0_1px_2px_rgba(0,0,0,0.2)] [-webkit-tap-highlight-color:transparent]"
              >
                Voir mes séances live
              </button>
            </div>

            <div
              className={cn(
                "rounded-[14px] border px-4 py-3 shadow-[0_0_0_0.5px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_0.5px_rgba(255,255,255,0.08)]",
                computedLiveState === "none" && "border-border/70 bg-card",
                computedLiveState === "upcoming" && "border-[#FFE28A] bg-[#FFF7D6] text-[#6A4A00]",
                computedLiveState === "live" && "border-[#FFB8B8] bg-[#FFE5E5] text-[#7A1212]"
              )}
            >
              {computedLiveState === "none" && (
                <p className="text-[15px] font-medium leading-snug text-foreground">
                  Vous ne participez à aucune séance live actuellement.
                </p>
              )}
              {computedLiveState === "upcoming" && session && (
                <div className="min-w-0 space-y-1">
                  <p className="text-[15px] font-semibold leading-snug">
                    Séance « {session.title || "Séance"} »
                  </p>
                  <p className="text-[13px] opacity-90">
                    Le suivi en direct sera disponible à{" "}
                    {new Date(session.scheduled_at).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    .
                  </p>
                </div>
              )}
              {computedLiveState === "live" && session && (
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-[15px] font-semibold leading-snug">
                      En direct — {session.title || "Séance"}
                    </p>
                    <p className="text-[13px] opacity-90">
                      Partagez votre position pour apparaître sur la carte des autres participants.
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
                    <div className="flex items-center gap-2 rounded-xl bg-background/80 px-2 py-1.5">
                      <span className="max-w-[140px] truncate text-[13px] font-medium text-foreground">
                        Partager ma position
                      </span>
                      <Switch
                        checked={sharingOptIn}
                        onCheckedChange={(on) => {
                          if (sessionId) setLiveShareOptIn(sessionId, on);
                        }}
                        disabled={!sessionId}
                        aria-label="Partager ma position en direct"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-9 rounded-full px-3 text-[12px] font-semibold"
                      onClick={() => sessionId && navigate(`/session-tracking/${sessionId}`)}
                    >
                      Carte pleine
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div
              ref={mapFrameRef}
              className="relative h-[420px] w-full min-w-0 overflow-hidden rounded-[18px] bg-card shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.25)]"
              style={{ isolation: "isolate" }}
            >
              <div ref={mapContainerRef} className="absolute inset-0 z-[1] min-h-0 w-full bg-muted" />
              {!mapReady ? (
                <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center bg-secondary/90" aria-hidden>
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : null}
              <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => fitDefaultView()}
                  className="map-overlay-fab-btn"
                  aria-label="Recentrer sur ma position"
                >
                  <Navigation strokeWidth={2} className="h-[17px] w-[17px]" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => void toggleMapFullscreen()}
                  className="map-overlay-fab-btn"
                  aria-label={isMapFullscreen ? "Quitter le plein écran" : "Plein écran"}
                >
                  {isMapFullscreen ? (
                    <Minimize2 strokeWidth={2} className="h-[17px] w-[17px]" aria-hidden />
                  ) : (
                    <Expand strokeWidth={2} className="h-[17px] w-[17px]" aria-hidden />
                  )}
                </button>
              </div>
            </div>

            {computedLiveState === "live" && (
              <div className="space-y-2">
                <p className="px-0.5 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                  En direct près de vous
                </p>
                {otherParticipantsSorted.length === 0 ? (
                  <div className="rounded-[14px] border border-border/60 bg-card px-4 py-4 text-center text-[14px] text-muted-foreground">
                    Aucun autre participant en direct pour le moment.
                  </div>
                ) : (
                  otherParticipantsSorted.map(({ participant: p, distM }) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => centerOnParticipant(p.id)}
                      className="ios-list-row flex min-w-0 w-full items-center gap-3 border border-white px-4 py-3 text-left shadow-[0_0_0_0.5px_rgba(0,0,0,0.04)] active:bg-secondary dark:border-white/10 dark:shadow-[0_0_0_0.5px_rgba(255,255,255,0.08)] [-webkit-tap-highlight-color:transparent]"
                    >
                      <Avatar className="h-11 w-11 shrink-0 border border-border/40">
                        <AvatarImage src={p.avatar ?? undefined} />
                        <AvatarFallback className="text-sm font-semibold">{p.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[17px] font-medium text-foreground">{p.name}</p>
                        <p className="text-[13px] text-muted-foreground">
                          {Number.isFinite(distM) ? `À ${formatDistanceLabel(distM, unit)} de vous` : "Distance indisponible"}
                        </p>
                      </div>
                      <ChevronRight className="h-[18px] w-[18px] shrink-0 text-muted-foreground/45" aria-hidden />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </IosFixedPageHeaderShell>

      {showLiveSessionsPanel && (
        <div className="absolute inset-0 z-50 bg-background">
          <div className="sticky top-0 z-10 border-b border-border bg-card/95 px-4 pb-3 pt-[var(--safe-area-top)]">
            <div className="relative mb-2 flex min-h-[44px] items-center">
              <button
                type="button"
                onClick={() => setShowLiveSessionsPanel(false)}
                className="flex min-w-0 items-center gap-ios-1 text-primary active:opacity-70"
                aria-label="Retour"
              >
                <ChevronLeft className="h-6 w-6 shrink-0" />
                <span className="truncate text-ios-headline">Retour</span>
              </button>
              <p className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[17px] font-semibold">Mes séances live</p>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={sessionsSearch}
                onChange={(e) => setSessionsSearch(e.target.value)}
                placeholder="Rechercher une séance live"
                className="h-10 rounded-xl border-border/70 bg-background pl-9"
              />
            </div>
            <div className="mt-3 flex gap-ios-2 overflow-x-auto pb-ios-1">
              {[
                { key: "live" as const, label: "En cours" },
                { key: "upcoming" as const, label: "À venir" },
                { key: "recent" as const, label: "Terminées" },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setLiveSessionsFilter(f.key)}
                  className={cn(
                    "px-ios-3 py-1.5 min-h-[32px] rounded-full text-[12px] leading-tight font-medium whitespace-nowrap transition-colors",
                    liveSessionsFilter === f.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2 px-4 py-3">
            {filteredLiveSessions.length === 0 ? (
              <p className="pt-6 text-center text-[14px] text-muted-foreground">Aucune séance live trouvée.</p>
            ) : (
              filteredLiveSessions.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => {
                    setShowLiveSessionsPanel(false);
                    navigate(`/participants?sessionId=${row.id}`);
                  }}
                  className="ios-list-row border border-white dark:border-white/10 text-left active:bg-secondary"
                >
                  <div className="flex items-start gap-ios-2">
                    <ActivityIcon activityType={row.activity_type || "course"} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="mb-0.5 flex items-center gap-1.5">
                        <Badge
                          variant={
                            liveSessionsFilter === "live"
                              ? "destructive"
                              : liveSessionsFilter === "upcoming"
                                ? "default"
                                : "secondary"
                          }
                          className="text-xs"
                        >
                          {liveSessionsFilter === "live"
                            ? "En cours"
                            : liveSessionsFilter === "upcoming"
                              ? "À venir"
                              : "Terminée"}
                        </Badge>
                      </div>
                      <h3 className="truncate text-ios-headline font-semibold">{row.title || "Séance live"}</h3>
                      <div className="mt-0.5 flex items-center gap-ios-3 text-[12px] leading-tight text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <Calendar className="h-3 w-3 shrink-0" />
                          {new Date(row.scheduled_at).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3 shrink-0" />
                          {new Date(row.scheduled_at).toLocaleTimeString("fr-FR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Users className="h-3 w-3 shrink-0" />
                          {row.current_participants || 0}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/50" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
