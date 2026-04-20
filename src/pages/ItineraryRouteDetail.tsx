import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Map as MapboxMap, Marker } from 'mapbox-gl';
import { loadMapboxGl } from '@/lib/mapboxLazy';
import {
  ArrowLeft,
  Box,
  CalendarPlus,
  ChevronRight,
  Download,
  Loader2,
  Navigation,
  Route as RouteIcon,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDistanceUnits } from '@/contexts/DistanceUnitsContext';
import { formatDistanceAlongPathMeters } from '@/lib/distanceUnits';
import { routeJsonToElevations, routeJsonToPoints } from '@/lib/routeCoordinates';
import type { MyRouteRow } from '@/hooks/useMyRoutesList';
import { getMapboxAccessToken } from '@/lib/mapboxConfig';
import { createEmbeddedMapboxMap, fitMapToCoords, setOrUpdateLineLayer } from '@/lib/mapboxEmbed';
import type { MapCoord } from '@/lib/geoUtils';
import {
  RouteElevationPanel,
  type RouteElevationScrubMeta,
} from '@/components/route-creation/RouteElevationPanel';
import { exportToGPX, shareOrDownloadGPX, type GPXTrackPoint } from '@/lib/gpxExport';
import { ElevationProfile3DDialog } from '@/components/ElevationProfile3DDialog';
import { IosFixedPageHeaderShell } from '@/components/layout/IosFixedPageHeaderShell';
import { IosPageHeaderBar } from '@/components/layout/IosPageHeaderBar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

const DETAIL_LINE_SRC = 'itinerary-detail-line';
const DETAIL_LINE_LAYER = 'itinerary-detail-line-layer';

export default function ItineraryRouteDetail() {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatKm, formatMeters, unit } = useDistanceUnits();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const scrubMarkerRef = useRef<Marker | null>(null);

  const [route, setRoute] = useState<MyRouteRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [show3D, setShow3D] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!user || !routeId) {
      setRoute(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('routes')
          .select('*')
          .eq('id', routeId)
          .eq('created_by', user.id)
          .maybeSingle();
        if (error) throw error;
        if (!cancelled) setRoute((data as MyRouteRow) || null);
      } catch (e) {
        console.error(e);
        if (!cancelled) setRoute(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, routeId]);

  const points = useMemo(() => (route ? routeJsonToPoints(route.coordinates) : []), [route]);
  const elevations = useMemo(() => (route ? routeJsonToElevations(route.coordinates) : []), [route]);

  useEffect(() => {
    if (!mapContainerRef.current || points.length < 2 || !getMapboxAccessToken()) return;
    mapRef.current?.remove();
    mapRef.current = null;
    scrubMarkerRef.current?.remove();
    scrubMarkerRef.current = null;

    let cancelled = false;

    void (async () => {
      const m = await createEmbeddedMapboxMap(mapContainerRef.current!, {
        center: points[0]!,
        zoom: 12,
        interactive: true,
      });
      if (cancelled) {
        m.remove();
        return;
      }
      mapRef.current = m;

      const apply = async () => {
        setOrUpdateLineLayer(m, DETAIL_LINE_SRC, DETAIL_LINE_LAYER, points, {
          color: '#5B7CFF',
          width: 5,
        });
        await fitMapToCoords(m, points, 48);
      };
      if (m.isStyleLoaded()) void apply();
      else m.once('load', () => void apply());
    })();

    return () => {
      cancelled = true;
      scrubMarkerRef.current?.remove();
      scrubMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [points]);

  const clearScrubMarker = () => {
    scrubMarkerRef.current?.remove();
    scrubMarkerRef.current = null;
  };

  const handleElevationScrub = useCallback((meta: RouteElevationScrubMeta | null) => {
    const m = mapRef.current;
    if (!m) return;
    if (!meta) {
      clearScrubMarker();
      return;
    }
    if (!scrubMarkerRef.current) {
      void (async () => {
        const mapboxgl = await loadMapboxGl();
        const mapInst = mapRef.current;
        if (!mapInst || !meta) return;
        const el = document.createElement('div');
        el.style.width = '14px';
        el.style.height = '14px';
        el.style.borderRadius = '9999px';
        el.style.background = '#2563eb';
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.35)';
        scrubMarkerRef.current = new mapboxgl.Marker({ element: el })
          .setLngLat([meta.lng, meta.lat])
          .addTo(mapInst);
      })();
    } else {
      scrubMarkerRef.current.setLngLat([meta.lng, meta.lat]);
    }
  }, []);

  const totalDistanceM = route?.total_distance ?? 0;
  const elevGain = route?.total_elevation_gain ?? 0;
  const elevLoss = route?.total_elevation_loss ?? 0;

  const chartCoords: MapCoord[] = useMemo(() => {
    if (elevations.length >= 2 && points.length === elevations.length) return points;
    return points;
  }, [points, elevations]);

  const chartElevs = useMemo(() => {
    if (elevations.length >= 2 && points.length === elevations.length) return elevations;
    return points.map(() => 0);
  }, [points, elevations]);

  const handleGpx = async () => {
    if (!route?.coordinates || !Array.isArray(route.coordinates)) return;
    let trackPoints: GPXTrackPoint[] = route.coordinates
      .map((coord: any) => {
        if (coord.lat !== undefined && coord.lng !== undefined) {
          return {
            lat: Number(coord.lat),
            lng: Number(coord.lng),
            elevation: coord.elevation != null ? Number(coord.elevation) : undefined,
          };
        }
        if (Array.isArray(coord) && coord.length >= 2) {
          return {
            lat: Number(coord[0]),
            lng: Number(coord[1]),
            elevation: coord.length > 2 ? Number(coord[2]) : undefined,
          };
        }
        return null;
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
    if (trackPoints.length === 0) return;

    const allElevMissing = trackPoints.every((p) => p.elevation == null || p.elevation === 0);
    if (allElevMissing && trackPoints.length >= 2) {
      try {
        const { fetchElevationsForCoords } = await import('@/lib/openElevation');
        const { densifyMapCoords, resamplePathEvenlyMapCoords, pathLengthMeters } = await import('@/lib/geoUtils');
        const path = trackPoints.map((p) => ({ lat: p.lat, lng: p.lng }));
        const dens = densifyMapCoords(path, 14);
        const lenM = pathLengthMeters(dens);
        const samples = Math.min(4000, Math.max(80, Math.ceil(lenM / 12)));
        const sampled = resamplePathEvenlyMapCoords(dens, samples);
        const elevs = await fetchElevationsForCoords(sampled);
        if (elevs.length === sampled.length && elevs.some((e) => e !== 0)) {
          trackPoints = sampled.map((c, i) => ({ lat: c.lat, lng: c.lng, elevation: elevs[i]! }));
        }
      } catch (e) {
        console.warn('[GPX] Elevation re-fetch failed:', e);
      }
    }

    const gpx = exportToGPX(route.name, trackPoints, route.description || undefined);
    await shareOrDownloadGPX(route.name, gpx, { title: route.name });
  };

  const openSession = () => {
    if (!route) return;
    navigate({ pathname: '/', search: `?presetRoute=${encodeURIComponent(route.id)}` });
  };

  const confirmDelete = async () => {
    if (!user || !route) return;
    try {
      const { error } = await supabase.from('routes').delete().eq('id', route.id).eq('created_by', user.id);
      if (error) throw error;
      navigate('/itinerary/my-routes', { replace: true });
    } catch (e) {
      console.error(e);
    } finally {
      setDeleteOpen(false);
    }
  };

  return (
    <>
      <IosFixedPageHeaderShell
        className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-x-hidden bg-secondary"
        headerWrapperClassName="shrink-0"
        contentScroll
        scrollClassName="min-h-0 bg-secondary"
        header={
          <div className="min-w-0 border-b border-border bg-card/95 pt-[var(--safe-area-top)]">
            <IosPageHeaderBar
              left={
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex min-w-0 items-center gap-1 text-primary"
                >
                  <ArrowLeft className="h-5 w-5 shrink-0" />
                  <span className="truncate text-[17px] font-medium">Retour</span>
                </button>
              }
              right={
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="inline-flex h-9 min-w-[44px] items-center justify-end text-destructive"
                  aria-label="Supprimer l'itinéraire"
                >
                  <span className="text-[20px]" aria-hidden>
                    🗑️
                  </span>
                </button>
              }
              title={route?.name || 'Itinéraire'}
            />
          </div>
        }
      >
        <ScrollArea className="h-full min-h-0 min-w-0 flex-1 overflow-x-hidden [&>div>div[style]]:!overflow-y-auto [&_.scrollbar]:hidden [&>div>div+div]:hidden">
          <div className="min-w-0 max-w-full pb-24 pt-2">
            {!user ? (
              <p className="px-4 py-8 text-center text-ios-subheadline text-muted-foreground">
                Connectez-vous pour voir cet itinéraire.
              </p>
            ) : loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !route ? (
              <p className="px-4 py-8 text-center text-ios-subheadline text-muted-foreground">
                Itinéraire introuvable.
              </p>
            ) : (
              <div className="mx-auto min-w-0 max-w-full space-y-4 px-4 ios-shell:px-2.5 sm:max-w-2xl">
                <div
                  ref={mapContainerRef}
                  className="min-h-[min(42vh,22rem)] w-full overflow-hidden rounded-2xl border border-border/60 bg-muted shadow-sm"
                />

                {route.description && (
                  <p className="text-ios-subheadline leading-relaxed text-muted-foreground">{route.description}</p>
                )}

                <div className="ios-card border border-border/60 p-3 shadow-sm">
                  <RouteElevationPanel
                    elevations={chartElevs}
                    coords={chartCoords}
                    totalDistanceM={Math.max(1, totalDistanceM)}
                    elevationGain={elevGain}
                    elevationLoss={elevLoss}
                    formatDistanceKm={formatKm}
                    formatDistanceAlongPath={(m) => formatDistanceAlongPathMeters(m, unit)}
                    defaultExpanded
                    onScrub={handleElevationScrub}
                  />
                </div>

                <div className="bg-card">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-4 py-3 active:bg-secondary/50 ios-shell:px-2.5"
                    onClick={handleGpx}
                  >
                    <div className="ios-list-row-icon bg-[#34C759]">
                      <Download className="h-[18px] w-[18px] text-white" />
                    </div>
                    <span className="min-w-0 flex-1 text-left text-[15px] font-medium">Télécharger en GPX</span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground/45" />
                  </button>
                  <div className="ios-list-row-inset-sep" />
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-4 py-3 active:bg-secondary/50 ios-shell:px-2.5"
                    onClick={openSession}
                  >
                    <div className="ios-list-row-icon bg-[#0A84FF]">
                      <CalendarPlus className="h-[18px] w-[18px] text-white" />
                    </div>
                    <span className="min-w-0 flex-1 text-left text-[15px] font-medium">Planifier une séance avec cet itinéraire</span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground/45" />
                  </button>
                  <div className="ios-list-row-inset-sep" />
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-4 py-3 active:bg-secondary/50 ios-shell:px-2.5"
                    onClick={() => setShow3D(true)}
                  >
                    <div className="ios-list-row-icon bg-[#5E5CE6]">
                      <Box className="h-[18px] w-[18px] text-white" />
                    </div>
                    <span className="min-w-0 flex-1 text-left text-[15px] font-medium">Survoler l’itinéraire</span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground/45" />
                  </button>
                  <div className="ios-list-row-inset-sep" />
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-4 py-3 active:bg-secondary/50 ios-shell:px-2.5"
                    onClick={() => navigate(`/training/route/${route.id}`)}
                  >
                    <div className="ios-list-row-icon bg-[#FF9500]">
                      <Navigation className="h-[18px] w-[18px] text-white" />
                    </div>
                    <span className="min-w-0 flex-1 text-left text-[15px] font-medium">Mode entraînement</span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground/45" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </IosFixedPageHeaderShell>

      {route && (
        <ElevationProfile3DDialog
          open={show3D}
          onOpenChange={setShow3D}
          coordinates={
            Array.isArray(route.coordinates)
              ? route.coordinates.map((c: any) => ({ lat: Number(c.lat ?? c[0]), lng: Number(c.lng ?? c[1]) }))
              : []
          }
          elevations={
            Array.isArray(route.coordinates)
              ? route.coordinates.map((c: any) => Number(c.elevation ?? c[2] ?? 0))
              : []
          }
          routeName={route.name}
          routeStats={
            route.total_distance || route.total_elevation_gain
              ? {
                  totalDistance: route.total_distance || 0,
                  elevationGain: route.total_elevation_gain || 0,
                  elevationLoss: route.total_elevation_loss || 0,
                }
              : null
          }
        />
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-ios-lg max-w-[320px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l&apos;itinéraire ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est définitive. Les séances passées qui référencent ce tracé peuvent être affectées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogCancel className="w-full">Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
