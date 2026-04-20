import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSessionTracking } from '@/hooks/useSessionTracking';
import type { Map as MapboxMap, Marker } from 'mapbox-gl';
import { loadMapboxGl } from '@/lib/mapboxLazy';
import { ArrowLeft, Navigation, Radio, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { imageUrlToBase64 } from '@/lib/map-marker-generator';
import { haversineMeters, formatDistanceLabel } from '@/lib/geo';
import { useDistanceUnits } from '@/contexts/DistanceUnitsContext';
import { ProfilePreviewDialog } from '@/components/ProfilePreviewDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { getMapboxAccessToken } from '@/lib/mapboxConfig';
import { createEmbeddedMapboxMap, fitMapToCoords, setOrUpdateLineLayer, removeLineLayer } from '@/lib/mapboxEmbed';
import type { MapCoord } from '@/lib/geoUtils';

const ROUTE_COLOR = '#FF6B35';
const ROUTE_SRC = 'session-tracking-route';
const ROUTE_LAYER = 'session-tracking-route-layer';

function elFromIconDataUrl(url: string, w: number, h: number): HTMLDivElement {
  const el = document.createElement('div');
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
  el.style.backgroundImage = `url(${url})`;
  el.style.backgroundSize = 'contain';
  el.style.backgroundRepeat = 'no-repeat';
  el.style.backgroundPosition = 'center';
  return el;
}

export default function SessionTracking() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { unit } = useDistanceUnits();
  const {
    session,
    routeCoordinates,
    participantPositions,
    participantProfiles,
    userPosition,
    loading,
    error,
    sessionAllowsLive,
    inLiveWindow,
    sharingOptIn,
    isBroadcasting,
  } = useSessionTracking(sessionId);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapboxMapRef = useRef<MapboxMap | null>(null);
  const userMarkerRef = useRef<Marker | null>(null);
  const participantMarkersRef = useRef<Map<string, Marker>>(new Map());
  const [mapReady, setMapReady] = useState(false);
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !mapContainerRef.current) return;
    if (!getMapboxAccessToken()) return;

    let cancelled = false;

    void (async () => {
      const map = await createEmbeddedMapboxMap(mapContainerRef.current!, {
        center: { lat: Number(session.location_lat), lng: Number(session.location_lng) },
        zoom: 15,
        interactive: true,
      });
      if (cancelled) {
        map.remove();
        return;
      }
      mapboxMapRef.current = map;

      const boot = () => {
        if (cancelled) return;
        setMapReady(true);
      };
      if (map.isStyleLoaded()) boot();
      else map.once('load', boot);
    })();

    return () => {
      cancelled = true;
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      participantMarkersRef.current.forEach((m) => m.remove());
      participantMarkersRef.current.clear();
      mapboxMapRef.current?.remove();
      mapboxMapRef.current = null;
      setMapReady(false);
    };
  }, [session?.id]);

  useEffect(() => {
    const map = mapboxMapRef.current;
    if (!map || !mapReady || !session) return;

    const coords: MapCoord[] = routeCoordinates.map((c) => ({ lat: c.lat, lng: c.lng }));
    void (async () => {
      if (coords.length > 0) {
        setOrUpdateLineLayer(map, ROUTE_SRC, ROUTE_LAYER, coords, { color: ROUTE_COLOR, width: 5 });
        await fitMapToCoords(map, coords, 60);
      } else {
        removeLineLayer(map, ROUTE_SRC, ROUTE_LAYER);
        map.jumpTo({
          center: [Number(session.location_lng), Number(session.location_lat)],
          zoom: 15,
        });
      }
    })();
  }, [mapReady, routeCoordinates, session]);

  const createBlueDotIcon = useCallback(() => {
    const size = 60;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 5, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.55)');
    gradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.25)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = '#10b981';
    ctx.shadowColor = 'rgba(16, 185, 129, 0.8)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 9, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 9, 0, 2 * Math.PI);
    ctx.stroke();
    return canvas.toDataURL('image/png');
  }, []);

  const createPhotoMarkerIcon = useCallback(async (avatarUrl: string | null, ringColor: string): Promise<string> => {
    const size = 52;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const radius = size / 2;
    const borderWidth = 3;
    const innerRadius = radius - borderWidth;

    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(radius, radius, radius - 1, 0, 2 * Math.PI);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    if (avatarUrl) {
      try {
        const base64 = await imageUrlToBase64(avatarUrl);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject();
          img.src = base64;
        });
        ctx.save();
        ctx.beginPath();
        ctx.arc(radius, radius, innerRadius, 0, 2 * Math.PI);
        ctx.clip();
        ctx.drawImage(img, borderWidth, borderWidth, size - borderWidth * 2, size - borderWidth * 2);
        ctx.restore();
      } catch {
        ctx.fillStyle = '#e8e8ed';
        ctx.beginPath();
        ctx.arc(radius, radius, innerRadius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = '#888';
        ctx.font = `${size * 0.35}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', radius, radius);
      }
    } else {
      ctx.fillStyle = '#e8e8ed';
      ctx.beginPath();
      ctx.arc(radius, radius, innerRadius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = '#888';
      ctx.font = `${size * 0.35}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', radius, radius);
    }

    ctx.strokeStyle = ringColor;
    ctx.lineWidth = borderWidth;
    ctx.beginPath();
    ctx.arc(radius, radius, innerRadius, 0, 2 * Math.PI);
    ctx.stroke();

    return canvas.toDataURL('image/png');
  }, []);

  useEffect(() => {
    if (!mapboxMapRef.current || !userPosition || !mapReady || !user) return;

    let cancelled = false;
    const map = mapboxMapRef.current;
    const prof = participantProfiles.get(user.id);
    const avatarUrl = prof?.avatar_url ?? null;

    const run = async () => {
      const w = avatarUrl ? 52 : 60;
      const h = avatarUrl ? 52 : 60;
      const iconUrl = avatarUrl ? await createPhotoMarkerIcon(avatarUrl, '#10b981') : createBlueDotIcon();
      if (cancelled) return;

      if (userMarkerRef.current) {
        userMarkerRef.current.setLngLat([userPosition.lng, userPosition.lat]);
        userMarkerRef.current.getElement().style.backgroundImage = `url(${iconUrl})`;
        userMarkerRef.current.getElement().style.width = `${w}px`;
        userMarkerRef.current.getElement().style.height = `${h}px`;
      } else {
        const mapboxgl = await loadMapboxGl();
        if (cancelled) return;
        const el = elFromIconDataUrl(iconUrl, w, h);
        userMarkerRef.current = new mapboxgl.Marker({ element: el })
          .setLngLat([userPosition.lng, userPosition.lat])
          .addTo(map);
        map.flyTo({ center: [userPosition.lng, userPosition.lat], zoom: 16, duration: 500 });
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [userPosition, mapReady, user, participantProfiles, createPhotoMarkerIcon, createBlueDotIcon]);

  useEffect(() => {
    if (!mapboxMapRef.current || !mapReady) return;
    const map = mapboxMapRef.current;
    let cancelled = false;

    const sync = async () => {
      const seen = new Set<string>();
      for (const [uid, pos] of participantPositions.entries()) {
        if (uid === user?.id) continue;
        seen.add(uid);

        const existing = participantMarkersRef.current.get(uid);
        if (existing) {
          existing.setLngLat([pos.lng, pos.lat]);
          continue;
        }

        const profile = participantProfiles.get(uid);
        const avatarUrl = profile?.avatar_url || pos.avatar_url;
        const iconUrl = await createPhotoMarkerIcon(avatarUrl, '#3b82f6');
        if (cancelled) return;

        const mapboxgl = await loadMapboxGl();
        if (cancelled) return;
        const el = elFromIconDataUrl(iconUrl, 52, 52);
        const marker = new mapboxgl.Marker({ element: el }).setLngLat([pos.lng, pos.lat]).addTo(map);
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => setPreviewUserId(uid));
        participantMarkersRef.current.set(uid, marker);
      }

      for (const [uid, marker] of [...participantMarkersRef.current.entries()]) {
        if (!seen.has(uid)) {
          marker.remove();
          participantMarkersRef.current.delete(uid);
        }
      }
    };

    void sync();
    return () => {
      cancelled = true;
    };
  }, [participantPositions, mapReady, user, participantProfiles, createPhotoMarkerIcon]);

  useEffect(() => {
    return () => {
      userMarkerRef.current?.remove();
      participantMarkersRef.current.forEach((m) => m.remove());
    };
  }, []);

  const othersWithDistance = useMemo(() => {
    if (!userPosition) return [];
    const items: {
      uid: string;
      name: string;
      dist: number;
      avatar: string | null;
    }[] = [];
    participantPositions.forEach((pos, uid) => {
      if (uid === user?.id) return;
      const prof = participantProfiles.get(uid);
      const dist = haversineMeters(userPosition.lat, userPosition.lng, pos.lat, pos.lng);
      items.push({
        uid,
        name: prof?.display_name || prof?.username || 'Participant',
        dist,
        avatar: prof?.avatar_url || pos.avatar_url,
      });
    });
    items.sort((a, b) => a.dist - b.dist);
    return items;
  }, [userPosition, participantPositions, participantProfiles, user?.id]);

  const othersOnlineCount = othersWithDistance.length;

  const statusBanner = useMemo(() => {
    if (!sessionAllowsLive) {
      return {
        tone: 'muted' as const,
        text: 'Le live tracking n’est pas activé pour cette séance.',
      };
    }
    if (!inLiveWindow) {
      return {
        tone: 'muted' as const,
        text: 'Le partage de position n’est disponible que pendant le créneau horaire de la séance.',
      };
    }
    if (isBroadcasting) {
      return {
        tone: 'ok' as const,
        text: 'Ta position est partagée avec les participants (carte & liste).',
      };
    }
    if (!sharingOptIn) {
      return {
        tone: 'warn' as const,
        text: 'Pour partager ta position, active « Partager ma position » dans Mes séances.',
      };
    }
    return { tone: 'muted' as const, text: '' };
  }, [sessionAllowsLive, inLiveWindow, isBroadcasting, sharingOptIn]);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="absolute top-0 left-0 right-0 z-[9999] bg-card/95 backdrop-blur-md pt-[env(safe-area-inset-top)]">
          <div className="flex items-center px-4 py-3 border-b border-border/40">
            <Button variant="ghost" size="sm" onClick={handleBack} className="px-0 font-normal text-[17px]">
              <ArrowLeft className="h-5 w-5 mr-1" />
              Retour
            </Button>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-[15px] text-muted-foreground">Chargement du suivi…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center p-6">
        <div className="absolute top-0 left-0 right-0 z-[9999] bg-card/95 backdrop-blur-md pt-[env(safe-area-inset-top)]">
          <div className="flex items-center px-4 py-3 border-b border-border/40">
            <Button variant="ghost" size="sm" onClick={handleBack} className="px-0 font-normal text-[17px]">
              <ArrowLeft className="h-5 w-5 mr-1" />
              Retour
            </Button>
          </div>
        </div>
        <div className="text-center">
          <p className="text-[17px] text-foreground font-semibold mb-2">Erreur</p>
          <p className="text-[15px] text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background">
      <div className="absolute inset-0 z-0" style={{ isolation: 'isolate' }}>
        <div ref={mapContainerRef} className="w-full h-full bg-secondary" />
      </div>

      <div className="absolute top-0 left-0 right-0 z-[9999] bg-card/90 backdrop-blur-xl pt-[env(safe-area-inset-top)] pointer-events-auto border-b border-border/40 shadow-sm">
        <div className="flex items-center justify-between px-4 py-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="px-0 font-normal text-[17px] text-primary h-10"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            Retour
          </Button>
          <div className="flex-1 min-w-0 text-center px-2">
            <span className="text-[15px] font-semibold text-foreground truncate block">
              {session?.title || 'Suivi participants'}
            </span>
            {statusBanner.text && (
              <span
                className={cn(
                  'text-[11px] leading-tight mt-0.5 line-clamp-2 block',
                  statusBanner.tone === 'ok' && 'text-emerald-600',
                  statusBanner.tone === 'warn' && 'text-amber-600',
                  statusBanner.tone === 'muted' && 'text-muted-foreground',
                )}
              >
                {statusBanner.text}
              </span>
            )}
          </div>
          <div className="w-[72px] flex justify-end">
            {isBroadcasting && (
              <span className="flex h-8 items-center gap-1 rounded-full bg-emerald-500/15 px-2 text-[11px] font-semibold text-emerald-700">
                <Radio className="h-3 w-3 animate-pulse" />
                LIVE
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-[9999] pointer-events-auto pb-[max(12px,env(safe-area-inset-bottom))] px-3">
        <div className="rounded-[20px] bg-card/92 backdrop-blur-2xl border border-border/50 shadow-[0_-12px_48px_rgba(0,0,0,0.12)] overflow-hidden max-h-[min(40vh,320px)] flex flex-col">
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border/40">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
              <Users className="h-4 w-4 text-primary" />
              Autour de toi
            </div>
            <span className="text-[12px] text-muted-foreground tabular-nums">{othersOnlineCount} en ligne</span>
          </div>
          <div className="overflow-y-auto px-2 py-2 space-y-1">
            {!userPosition && (
              <p className="text-[13px] text-muted-foreground text-center py-6 px-4">
                Active la localisation pour voir les distances et ta position sur la carte.
              </p>
            )}
            {userPosition && othersOnlineCount === 0 && (
              <p className="text-[13px] text-muted-foreground text-center py-6 px-4">
                Aucun autre participant ne partage sa position pour l’instant.
              </p>
            )}
            {userPosition &&
              othersWithDistance.map((row) => (
                <button
                  key={row.uid}
                  type="button"
                  onClick={() => setPreviewUserId(row.uid)}
                  className="w-full flex items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition-colors active:bg-secondary/80 hover:bg-secondary/50"
                >
                  <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm">
                    <AvatarImage src={row.avatar || undefined} className="object-cover" />
                    <AvatarFallback className="text-xs font-semibold bg-primary/10">
                      {row.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium text-foreground truncate">{row.name}</p>
                    <p className="text-[12px] text-muted-foreground flex items-center gap-1">
                      <Navigation className="h-3 w-3 shrink-0" />
                      <span>
                        À{' '}
                        <span className="font-semibold text-foreground tabular-nums">
                          {formatDistanceLabel(row.dist, unit)}
                        </span>
                      </span>
                    </p>
                  </div>
                  <span className="text-[12px] font-medium text-primary/80 shrink-0">Voir</span>
                </button>
              ))}
          </div>
        </div>
      </div>

      <ProfilePreviewDialog userId={previewUserId} onClose={() => setPreviewUserId(null)} />
    </div>
  );
}
