import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Expand, Minimize2, Navigation, Search, Users, X } from "lucide-react";
import type { Map as MapboxMap, Marker } from "mapbox-gl";
import { IosPageHeaderBar } from "@/components/layout/IosPageHeaderBar";
import { MapIosColoredFab } from "@/components/map/MapIosColoredFab";
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
import { MAPBOX_NAVIGATION_DAY_STYLE } from "@/lib/mapboxConfig";

type Participant = {
  id: string;
  name: string;
  avatar: string | null;
  lat: number;
  lng: number;
  active: boolean;
};

const FALLBACK_POINT = { lat: 48.8668, lng: 2.3339 };
type LiveSessionRow = {
  id: string;
  title: string;
  scheduled_at: string;
};

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
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("sessionId") ?? undefined;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [peopleSearch, setPeopleSearch] = useState("");
  const [sessionsSearch, setSessionsSearch] = useState("");
  const [showLiveSessionsPanel, setShowLiveSessionsPanel] = useState(false);
  const [liveSessions, setLiveSessions] = useState<LiveSessionRow[]>([]);
  const [liveSessionsFilter, setLiveSessionsFilter] = useState<"live" | "upcoming" | "recent">("live");
  const [fallbackUserPosition, setFallbackUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [hasAutoCentered, setHasAutoCentered] = useState(false);
  const { getCurrentPosition } = useGeolocation();
  const {
    session,
    participantPositions,
    participantProfiles,
    userPosition,
    sessionAllowsLive,
    inLiveWindow,
    isBroadcasting,
  } = useSessionTracking(sessionId);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const userMarkerRef = useRef<Marker | null>(null);
  const rdvMarkerRef = useRef<Marker | null>(null);
  const participantMarkersRef = useRef<Map<string, Marker>>(new Map());
  const effectiveUserPosition = userPosition ?? fallbackUserPosition;
  const userPositionRef = useRef(effectiveUserPosition);

  useEffect(() => {
    userPositionRef.current = effectiveUserPosition;
  }, [effectiveUserPosition]);

  useEffect(() => {
    let cancelled = false;
    const hasTrackingUserPosition = !!userPosition;
    if (hasTrackingUserPosition) return;
    void (async () => {
      const pos = await getCurrentPosition(0, { mode: "fast" });
      if (cancelled || !pos) return;
      setFallbackUserPosition({ lat: pos.lat, lng: pos.lng });
    })();
    return () => {
      cancelled = true;
    };
  }, [getCurrentPosition, userPosition?.lat, userPosition?.lng]);

  const participants = useMemo<Participant[]>(
    () =>
      Array.from(participantPositions.entries()).map(([id, pos]) => ({
      id,
      name: pos.display_name || pos.username || "Participant",
      avatar: pos.avatar_url,
      lat: pos.lat,
      lng: pos.lng,
      active: true,
      })),
    [participantPositions]
  );

  const computedLiveState = useMemo<"none" | "upcoming" | "live">(() => {
    if (!session || !sessionAllowsLive) return "none";
    if (!inLiveWindow) return "upcoming";
    return "live";
  }, [session, sessionAllowsLive, inLiveWindow]);

  const fitDefaultView = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const center = userPositionRef.current ?? FALLBACK_POINT;
    map.easeTo({
      center: [center.lng, center.lat],
      zoom: 14.3,
      duration: 450,
      essential: true,
    });
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    let cancelled = false;
    const participantMarkers = participantMarkersRef.current;

    const bootMap = async () => {
      try {
        const map = await createEmbeddedMapboxMap(mapContainerRef.current!, {
          center: userPositionRef.current ?? FALLBACK_POINT,
          zoom: 14.3,
          interactive: true,
          style: MAPBOX_NAVIGATION_DAY_STYLE,
        });
        if (cancelled) {
          map.remove();
          return;
        }
        mapRef.current = map;
        let armedFallback = true;
        const styleFallbackTimer = window.setTimeout(() => {
          if (!armedFallback || cancelled || !mapRef.current) return;
          try {
            mapRef.current.setStyle(MAPBOX_NAVIGATION_DAY_STYLE);
          } catch {
            // Ignore, on garde la carte même si le style custom échoue.
          }
          mapRef.current.resize();
          setMapReady(true);
        }, 1200);

        const clearFallback = () => {
          armedFallback = false;
          window.clearTimeout(styleFallbackTimer);
        };

        const onReady = () => {
          if (cancelled) return;
          clearFallback();
          setMapReady(true);
          fitDefaultView();
          // iOS/WebView: force plusieurs resize au boot pour éviter la carte blanche.
          const t1 = window.setTimeout(() => mapRef.current?.resize(), 0);
          const t2 = window.setTimeout(() => mapRef.current?.resize(), 120);
          const t3 = window.setTimeout(() => mapRef.current?.resize(), 360);
          window.setTimeout(() => {
            window.clearTimeout(t1);
            window.clearTimeout(t2);
            window.clearTimeout(t3);
          }, 420);
        };
        map.once("load", onReady);
        map.once("style.load", onReady);
        map.once("idle", onReady);

        map.on("error", () => {
          if (cancelled || !mapRef.current) return;
          // Si le style préféré échoue, fallback immédiat vers style stable.
          try {
            mapRef.current.setStyle(MAPBOX_NAVIGATION_DAY_STYLE);
          } catch {
            // no-op
          }
          mapRef.current.resize();
          setMapReady(true);
        });
      } catch {
        // Retry léger pour éviter un échec transitoire d'init mapbox.
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
    if (!mapRef.current || !effectiveUserPosition) return;
    const nextZoom = hasAutoCentered ? undefined : 15.2;
    mapRef.current.easeTo({
      center: [effectiveUserPosition.lng, effectiveUserPosition.lat],
      zoom: nextZoom,
      duration: 420,
      essential: true,
    });
    if (!hasAutoCentered) setHasAutoCentered(true);
  }, [effectiveUserPosition, hasAutoCentered]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        mapRef.current?.resize();
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

    if (effectiveUserPosition) {
      void (async () => {
        const mapboxgl = await loadMapboxGl();
        if (cancelled || !mapRef.current) {
          return;
        }
        const existing = userMarkerRef.current;
        if (existing) {
          existing.setLngLat([effectiveUserPosition.lng, effectiveUserPosition.lat]);
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
          // Fallback dur: si le pin perso échoue, on garde un marker simple pour ne jamais bloquer la carte.
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
          .setLngLat([effectiveUserPosition.lng, effectiveUserPosition.lat])
          .addTo(mapRef.current);
        userMarkerRef.current = marker;
      })();
    } else {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
    }

    if (session && !rdvMarkerRef.current) {
      const rdvEl = document.createElement("div");
      rdvEl.className =
        "h-5 w-5 rounded-full border-2 border-white bg-[#FF3B30] shadow-[0_6px_14px_-8px_rgba(0,0,0,0.7)]";
      void (async () => {
        const mapboxgl = await loadMapboxGl();
        if (cancelled || !mapRef.current || rdvMarkerRef.current) return;
        rdvMarkerRef.current = new mapboxgl.Marker({ element: rdvEl })
          .setLngLat([Number(session.location_lng), Number(session.location_lat)])
          .addTo(mapRef.current);
      })();
    }
    if (!session) {
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
      const nowIso = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("sessions")
        .select("id, title, scheduled_at")
        .eq("live_tracking_enabled", true)
        .gte("scheduled_at", nowIso)
        .order("scheduled_at", { ascending: true })
        .limit(60);
      if (cancelled) return;
      setLiveSessions((data ?? []) as LiveSessionRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [showLiveSessionsPanel, authSession?.user?.id]);

  const filteredParticipants = useMemo(() => {
    const q = peopleSearch.trim().toLowerCase();
    if (!q) return participants;
    return participants.filter((p) => p.name.toLowerCase().includes(q));
  }, [participants, peopleSearch]);

  const filteredLiveSessions = useMemo(() => {
    const now = Date.now();
    const liveWindowMs = 2 * 60 * 60 * 1000;
    const byFilter = liveSessions.filter((s) => {
      const t = new Date(s.scheduled_at).getTime();
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

  const banner = useMemo(() => {
    const participantsCount = participants.length;
    if (computedLiveState === "none") {
      return {
        tone: "bg-[#F2F2F7] border-[#E5E5EA] text-[#3A3A3C]",
        title: "Aucune séance en cours",
        subtitle: "",
      };
    }
    if (computedLiveState === "upcoming") {
      return {
        tone: "bg-[#FFF7D6] border-[#FFE28A] text-[#6A4A00]",
        title: "Séance dans 25 min",
        subtitle: `${participantsCount} participants inscrits`,
      };
    }
    return {
      tone: "bg-[#FFE5E5] border-[#FFB8B8] text-[#7A1212]",
      title: `🔴 En direct • ${participantsCount} participants`,
      subtitle: session
        ? `${session.title || "Séance running"} • ${new Date(session.scheduled_at).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          })}`
        : "Séance running • 10:00 • 8 km",
    };
  }, [computedLiveState, participants.length, session]);

  return (
    <div className="fixed inset-0 bg-background">
      <div ref={mapContainerRef} className="absolute inset-0 z-0 bg-secondary" />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-[1] bg-secondary/80 transition-opacity duration-200",
          mapReady ? "opacity-0" : "opacity-100"
        )}
        aria-hidden
      />

      <div className="absolute left-0 right-0 top-0 z-20 border-b border-border bg-card/95 pt-[var(--safe-area-top)]">
        <IosPageHeaderBar
          left={
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-[17px] font-medium text-primary"
            >
              ← Retour
            </button>
          }
          title="Participants"
          right={<div className="h-6 w-6" />}
        />
      </div>

      <div className="absolute left-0 right-0 top-[calc(var(--safe-area-top)+56px)] z-20 px-4">
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 shadow-[0_10px_24px_-20px_rgba(0,0,0,0.45)] backdrop-blur-sm",
            banner.tone
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold">{banner.title}</p>
              {computedLiveState !== "none" && (
                <p className="mt-0.5 truncate text-[13px] opacity-80">{banner.subtitle}</p>
              )}
              {computedLiveState === "none" && (
                <button
                  type="button"
                  onClick={() => setShowLiveSessionsPanel(true)}
                  className="mt-1 text-[13px] font-semibold text-[#0A84FF]"
                >
                  Voir mes séances live
                </button>
              )}
            </div>
            {computedLiveState === "live" && (
              <Button
                type="button"
                size="sm"
                className="h-8 rounded-full bg-white/90 px-3 text-[12px] font-semibold text-[#0A84FF]"
                onClick={() => sessionId && navigate(`/session-tracking/${sessionId}`)}
              >
                Détails
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-[calc(190px+max(14px,env(safe-area-inset-bottom)))] right-[max(1rem,env(safe-area-inset-right))] z-30">
        <div className="pointer-events-auto flex flex-col overflow-hidden rounded-[16px] border border-black/[0.08] bg-white/88 shadow-[0_12px_30px_-16px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <MapIosColoredFab
            tone="gray"
            title="Recentrer"
            onClick={fitDefaultView}
            className="h-11 w-11 rounded-none bg-transparent shadow-none"
          >
            <Navigation className="h-[17px] w-[17px] text-foreground" />
          </MapIosColoredFab>
          <div className="mx-2 h-px bg-border/80" />
          <MapIosColoredFab
            tone="gray"
            title={isFullscreen ? "Quitter plein écran" : "Plein écran"}
            onClick={() => setIsFullscreen((v) => !v)}
            className="h-11 w-11 rounded-none bg-transparent shadow-none"
          >
            {isFullscreen ? (
              <Minimize2 className="h-[17px] w-[17px] text-foreground" />
            ) : (
              <Expand className="h-[17px] w-[17px] text-foreground" />
            )}
          </MapIosColoredFab>
        </div>
      </div>

      {computedLiveState === "live" && (
        <div className="absolute bottom-0 left-0 right-0 z-30 px-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <div className="rounded-[18px] border border-border/60 bg-card/94 px-3 py-3 shadow-[0_-10px_28px_rgba(0,0,0,0.1)] backdrop-blur-2xl">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[14px] font-semibold text-foreground">
                {participants.length} personne{participants.length > 1 ? "s" : ""} en live tracking
              </p>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={peopleSearch}
                onChange={(e) => setPeopleSearch(e.target.value)}
                placeholder="Rechercher une personne en live"
                className="h-10 rounded-xl border-border/70 bg-background pl-9"
              />
            </div>
            {peopleSearch.trim().length > 0 && (
              <div className="mt-2 max-h-28 space-y-1 overflow-y-auto">
                {filteredParticipants.length === 0 ? (
                  <p className="px-1 py-1 text-[12px] text-muted-foreground">Aucun participant trouvé.</p>
                ) : (
                  filteredParticipants.slice(0, 8).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => centerOnParticipant(p.id)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left active:bg-secondary"
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={p.avatar ?? undefined} />
                        <AvatarFallback>{p.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="truncate text-[13px] text-foreground">{p.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showLiveSessionsPanel && (
        <div className="absolute inset-0 z-50 bg-background">
          <div className="sticky top-0 z-10 border-b border-border bg-card/95 px-4 pb-3 pt-[var(--safe-area-top)]">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[17px] font-semibold">Mes séances live</p>
              <button
                type="button"
                onClick={() => setShowLiveSessionsPanel(false)}
                className="rounded-full p-2 text-foreground/80 active:bg-secondary"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
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
                { key: "recent" as const, label: "Récentes" },
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
                  className="w-full rounded-xl border border-border/70 bg-card px-3 py-3 text-left active:bg-secondary"
                >
                  <p className="truncate text-[15px] font-semibold text-foreground">{row.title || "Séance live"}</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {new Date(row.scheduled_at).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
