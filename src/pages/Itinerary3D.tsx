import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, ChevronRight } from 'lucide-react';
import { IosFixedPageHeaderShell } from '@/components/layout/IosFixedPageHeaderShell';
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

  return (
    <>
      <IosFixedPageHeaderShell
        className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-x-hidden bg-secondary"
        headerWrapperClassName="shrink-0"
        contentScroll
        scrollClassName="min-h-0 bg-secondary"
        header={
          <div className="min-w-0 border-b border-border bg-card/95 pt-[var(--safe-area-top)]">
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-4 py-2.5 ios-shell:px-2.5">
              <div className="flex min-w-0 justify-start">
                <button
                  type="button"
                  onClick={() => navigate('/itinerary')}
                  className="text-[17px] font-medium text-primary"
                >
                  Retour
                </button>
              </div>
              <h1 className="min-w-0 max-w-[220px] truncate text-center text-[17px] font-semibold text-foreground">
                Survol 3D
              </h1>
              <div className="flex min-w-0 justify-end" aria-hidden>
                <div className="h-9 w-14 shrink-0" />
              </div>
            </div>
          </div>
        }
      >
        <ScrollArea className="h-full min-h-0 min-w-0 flex-1 overflow-x-hidden [&>div>div[style]]:!overflow-y-auto [&_.scrollbar]:hidden [&>div>div+div]:hidden">
          <div className="min-w-0 max-w-full overflow-x-hidden py-4 pb-24">
            <div className="mx-auto box-border min-w-0 w-full max-w-full space-y-3 px-4 ios-shell:px-2.5 sm:max-w-2xl">
              <p className="text-ios-subheadline leading-relaxed text-muted-foreground">
                Choisissez un de vos itinéraires pour lancer le survol 3D (même visionneuse que sur la fiche itinéraire).
              </p>
              {loading ? (
                <div className="ios-card h-24 animate-pulse bg-secondary/80 p-6" />
              ) : routes.length === 0 ? (
                <div className="ios-card border border-border/60 p-6 text-center text-ios-subheadline text-muted-foreground">
                  Aucun itinéraire — créez-en un depuis le hub.
                </div>
              ) : (
                <div className="ios-card overflow-hidden border border-border/60">
                  {routes.map((r, i) => (
                    <div key={r.id}>
                      <button
                        type="button"
                        onClick={() => openFor(r)}
                        className="flex min-h-[52px] w-full min-w-0 max-w-full items-center gap-3 px-4 py-3 text-left active:bg-secondary ios-shell:px-2.5"
                      >
                        <div className="ios-list-row-icon shrink-0 bg-[#5856D6]">
                          <Box className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p className="truncate text-[17px] font-medium text-foreground">{r.name}</p>
                          {r.total_distance != null && (
                            <p className="text-[13px] text-muted-foreground">
                              {(r.total_distance / 1000).toFixed(1)} km
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                      </button>
                      {i < routes.length - 1 && <div className="ios-list-row-inset-sep" />}
                    </div>
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
          routeStats={
            picked.total_distance || picked.total_elevation_gain
              ? {
                  totalDistance: picked.total_distance || 0,
                  elevationGain: picked.total_elevation_gain || 0,
                  elevationLoss: picked.total_elevation_loss || 0,
                }
              : null
          }
        />
      )}
    </>
  );
}
