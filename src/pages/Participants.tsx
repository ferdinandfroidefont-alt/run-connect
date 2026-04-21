import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Expand, Minimize2, Navigation, Pencil, Radio, Users } from "lucide-react";
import type { Map as MapboxMap, Marker } from "mapbox-gl";
import { IosPageHeaderBar } from "@/components/layout/IosPageHeaderBar";
import { MapIosColoredFab } from "@/components/map/MapIosColoredFab";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { createEmbeddedMapboxMap } from "@/lib/mapboxEmbed";
import { createUserLocationMapboxMarker } from "@/lib/mapUserLocationIcon";
import { loadMapboxGl } from "@/lib/mapboxLazy";
import { useSessionTracking } from "@/hooks/useSessionTracking";
import { useAuth } from "@/hooks/useAuth";

type LiveState = "none" | "upcoming" | "live";

type Participant = {
  id: string;
  name: string;
  avatar: string | null;
  lat: number;
  lng: number;
  active: boolean;
};

const FALLBACK_POINT = { lat: 48.8668, lng: 2.3339 };
const BASE_PARTICIPANTS: Participant[] = [
  {
    id: "p1",
    name: "Alex",
    avatar: "https://i.pravatar.cc/120?img=32",
    lat: 48.8678,
    lng: 2.3362,
    active: true,
  },
  {
    id: "p2",
    name: "Lina",
    avatar: "https://i.pravatar.cc/120?img=47",
    lat: 48.8662,
    lng: 2.3313,
    active: true,
  },
  {
    id: "p3",
    name: "Tom",
    avatar: "https://i.pravatar.cc/120?img=14",
    lat: 48.8655,
    lng: 2.3369,
    active: false,
  },
  {
    id: "p4",
    name: "Ines",
    avatar: "https://i.pravatar.cc/120?img=25",
    lat: 48.8687,
    lng: 2.3308,
    active: true,
  },
  {
    id: "p5",
    name: "Noah",
    avatar: "https://i.pravatar.cc/120?img=61",
    lat: 48.8693,
    lng: 2.3354,
    active: true,
  },
];

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
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("sessionId") ?? undefined;
  const initialMode = searchParams.get("mode");
  const [forcedMode, setForcedMode] = useState<LiveState | null>(
    initialMode === "none" || initialMode === "upcoming" || initialMode === "live"
      ? initialMode
      : null
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [demoParticipants, setDemoParticipants] = useState<Participant[]>(BASE_PARTICIPANTS);
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

  const participants = useMemo<Participant[]>(() => {
    if (participantPositions.size === 0) return demoParticipants;
    return Array.from(participantPositions.entries()).map(([id, pos]) => ({
      id,
      name: pos.display_name || pos.username || "Participant",
      avatar: pos.avatar_url,
      lat: pos.lat,
      lng: pos.lng,
      active: true,
    }));
  }, [participantPositions, demoParticipants]);

  const computedLiveState = useMemo<LiveState>(() => {
    if (forcedMode) return forcedMode;
    if (!session || !sessionAllowsLive) return "none";
    if (!inLiveWindow) return "upcoming";
    return "live";
  }, [forcedMode, session, sessionAllowsLive, inLiveWindow]);

  const fitDefaultView = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const center = userPosition ?? FALLBACK_POINT;
    map.easeTo({
      center: [center.lng, center.lat],
      zoom: 14.3,
      duration: 450,
      essential: true,
    });
  }, [userPosition]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    let cancelled = false;
    const participantMarkers = participantMarkersRef.current;

    void (async () => {
      const map = await createEmbeddedMapboxMap(mapContainerRef.current!, {
        center: userPosition ?? FALLBACK_POINT,
        zoom: 14.3,
        interactive: true,
      });
      if (cancelled) {
        map.remove();
        return;
      }
      mapRef.current = map;
      map.once("load", () => fitDefaultView());
    })();

    return () => {
      cancelled = true;
      userMarkerRef.current?.remove();
      rdvMarkerRef.current?.remove();
      participantMarkers.forEach((m) => m.remove());
      participantMarkers.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [fitDefaultView, userPosition]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;

    if (userPosition) {
      void (async () => {
        const userMarker = await createUserLocationMapboxMarker(userPosition.lng, userPosition.lat);
        if (cancelled || !mapRef.current) {
          userMarker.remove();
          return;
        }
        userMarkerRef.current?.remove();
        userMarker.addTo(mapRef.current);
        userMarkerRef.current = userMarker;
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
  }, [session, userPosition]);

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
    if (computedLiveState !== "live" || participantPositions.size > 0) return;
    const t = window.setInterval(() => {
      setDemoParticipants((prev) =>
        prev.map((p) => ({
          ...p,
          lat: p.lat + (Math.random() - 0.5) * 0.00035,
          lng: p.lng + (Math.random() - 0.5) * 0.00035,
        }))
      );
    }, 3500);
    return () => window.clearInterval(t);
  }, [computedLiveState, participantPositions.size]);

  const banner = useMemo(() => {
    const participantsCount = participants.length;
    if (computedLiveState === "none") {
      return {
        tone: "bg-[#F2F2F7] border-[#E5E5EA] text-[#3A3A3C]",
        title: "Aucune séance en cours",
        subtitle: "Active le live pendant une séance pour suivre les participants",
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
              <p className="mt-0.5 truncate text-[13px] opacity-80">{banner.subtitle}</p>
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
            tone={computedLiveState === "live" ? "blue" : "gray"}
            title="Activer le live"
            onClick={() =>
              setForcedMode((s) => {
                if (s === "live") return "none";
                return "live";
              })
            }
            className="h-11 w-11 rounded-none bg-transparent shadow-none"
          >
            <Radio className="h-[17px] w-[17px]" />
          </MapIosColoredFab>
          <div className="mx-2 h-px bg-border/80" />
          <MapIosColoredFab
            tone="gray"
            title="Edition"
            onClick={() => setForcedMode("upcoming")}
            className="h-11 w-11 rounded-none bg-transparent shadow-none"
          >
            <Pencil className="h-[17px] w-[17px] text-foreground" />
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

      <div className="absolute bottom-0 left-0 right-0 z-30 px-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <div className="rounded-[22px] border border-border/60 bg-card/92 shadow-[0_-16px_46px_rgba(0,0,0,0.12)] backdrop-blur-2xl">
          <div className="flex justify-center pt-2">
            <span className="h-1.5 w-10 rounded-full bg-muted-foreground/35" />
          </div>
          <div className="px-4 pb-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[17px] font-semibold text-foreground">
                  {participants.length} participant{participants.length > 1 ? "s" : ""}
                </p>
                <p className="text-[13px] text-muted-foreground">
                  {computedLiveState === "none"
                    ? "Partage de position en attente"
                    : isBroadcasting
                    ? "Partage de position activé"
                    : "Live visible pour les participants"}
                </p>
              </div>
              <Users className="h-5 w-5 text-primary" />
            </div>

            <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
              {(computedLiveState === "none" ? [] : participants.slice(0, computedLiveState === "upcoming" ? 3 : 8)).map((p) => (
                <div key={p.id} className="relative shrink-0">
                  <Avatar className="h-11 w-11 ring-2 ring-background">
                    <AvatarImage src={p.avatar ?? undefined} className="object-cover" />
                    <AvatarFallback>{p.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                      p.active ? "bg-[#34C759]" : "bg-[#FF9500]"
                    )}
                  />
                </div>
              ))}
              {computedLiveState === "none" && (
                <p className="py-2 text-[13px] text-muted-foreground">
                  Aucun partage live pour l’instant.
                </p>
              )}
            </div>

            <Button
              type="button"
              className="mt-3 h-11 w-full rounded-[14px] bg-[#0A84FF] text-[16px] font-semibold"
              onClick={() => navigate("/route-create")}
            >
              Voir l’itinéraire
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
