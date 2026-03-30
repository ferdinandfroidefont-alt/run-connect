import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, ChevronRight, Mountain, Play } from 'lucide-react';
import { IosFixedPageHeaderShell } from '@/components/layout/IosFixedPageHeaderShell';
import { IosPageHeaderBar } from '@/components/layout/IosPageHeaderBar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMyRoutesList } from '@/hooks/useMyRoutesList';
import { ElevationProfile3DDialog } from '@/components/ElevationProfile3DDialog';
import { routeJsonToElevations, routeJsonToPoints } from '@/lib/routeCoordinates';
import type { MyRouteRow } from '@/hooks/useMyRoutesList';

export default function Itinerary3D() {
  const navigate = useNavigate();
  const { routes, loading } = useMyRoutesList();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<MyRouteRow | null>(null);

  const openFor = (r: MyRouteRow) => {
    setPicked(r);
    setOpen(true);
  };

  const coords = picked ? routeJsonToPoints(picked.coordinates) : [];
  const elevs = picked ? routeJsonToElevations(picked.coordinates) : [];

  const pickedStats =
    picked && (picked.total_distance || picked.total_elevation_gain)
      ? {
          totalDistance: picked.total_distance || 0,
          elevationGain: picked.total_elevation_gain || 0,
          elevationLoss: picked.total_elevation_loss || 0,
        }
      : null;

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
                  onClick={() => navigate('/itinerary')}
                  className="text-[17px] font-medium text-primary"
                >
                  Retour
                </button>
              }
              title="Survol 3D"
            />
          </div>
        }
      >
        <ScrollArea className="h-full min-h-0 min-w-0 flex-1 overflow-x-hidden [&>div>div[style]]:!overflow-y-auto [&_.scrollbar]:hidden [&>div>div+div]:hidden">
          <div className="min-w-0 max-w-full overflow-x-hidden py-4 pb-24">
            <div className="mx-auto box-border min-w-0 w-full max-w-full space-y-4 px-4 ios-shell:px-2.5 sm:max-w-2xl">
              <section className="overflow-hidden rounded-[26px] border border-black/10 bg-[linear-gradient(145deg,#0f172a_0%,#111827_48%,#1d4ed8_100%)] px-5 py-5 text-white shadow-[0_18px_45px_-22px_rgba(15,23,42,0.75)]">
                <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.18em] text-white/60">
                  <Box className="h-4 w-4" />
                  Flyover immersif
                </div>
                <h2 className="mt-3 text-[26px] font-semibold leading-tight tracking-tight">
                  Survolez vos itinéraires comme un drone.
                </h2>
                <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-white/74">
                  Relief 3D, caméra inclinée, suivi fluide du tracé et interface minimale pour une lecture plus premium.
                </p>
              </section>

              {loading ? (
                <div className="ios-card h-28 animate-pulse bg-secondary/80 p-6" />
              ) : routes.length === 0 ? (
                <div className="ios-card border border-border/60 p-6 text-center text-ios-subheadline text-muted-foreground">
                  Aucun itinéraire — créez-en un depuis le hub.
                </div>
              ) : (
                <div className="space-y-3">
                  {routes.map((r, i) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => openFor(r)}
                      className="ios-card flex w-full min-w-0 items-center gap-4 border border-border/60 px-4 py-4 text-left transition active:scale-[0.99] active:bg-secondary/70"
                    >
                      <div className="ios-list-row-icon shrink-0 bg-[#5856D6]">
                        <Box className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate text-[17px] font-semibold text-foreground">{r.name}</p>
                          {i === 0 && (
                            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                              3D
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                          {r.total_distance != null && (
                            <span className="rounded-full bg-secondary px-2.5 py-1 font-medium">
                              {(r.total_distance / 1000).toFixed(1)} km
                            </span>
                          )}
                          {r.total_elevation_gain != null && r.total_elevation_gain > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 font-medium">
                              <Mountain className="h-3.5 w-3.5" />
                              D+ {Math.round(r.total_elevation_gain)} m
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="hidden rounded-full bg-foreground px-3 py-1.5 text-[12px] font-semibold text-background sm:inline-flex">
                          <Play className="mr-1 h-3.5 w-3.5" />
                          Lancer
                        </span>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </IosFixedPageHeaderShell>

      {picked && (
        <ElevationProfile3DDialog
          open={open}
          onOpenChange={setOpen}
          coordinates={coords}
          elevations={elevs}
          routeName={picked.name}
          routeStats={pickedStats}
        />
      )}
    </>
  );
}
