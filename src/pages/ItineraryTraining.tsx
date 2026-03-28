import { useNavigate } from 'react-router-dom';
import { Navigation, ChevronRight } from 'lucide-react';
import { IosFixedPageHeaderShell } from '@/components/layout/IosFixedPageHeaderShell';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMyRoutesList } from '@/hooks/useMyRoutesList';

export default function ItineraryTraining() {
  const navigate = useNavigate();
  const { routes, loading } = useMyRoutesList();

  return (
    <IosFixedPageHeaderShell
      className="flex h-full min-h-0 flex-col bg-secondary"
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
            <h1 className="max-w-[220px] truncate text-center text-[17px] font-semibold text-foreground">
              Entraînement
            </h1>
            <div className="flex min-w-0 justify-end" aria-hidden>
              <div className="h-9 w-14 shrink-0" />
            </div>
          </div>
        </div>
      }
    >
      <ScrollArea className="h-full min-h-0 flex-1 [&>div>div[style]]:!overflow-y-auto [&_.scrollbar]:hidden [&>div>div+div]:hidden">
        <div className="px-4 py-4 pb-24 space-y-3">
          <p className="text-ios-subheadline text-muted-foreground leading-relaxed">
            Ouvrez le mode entraînement pour un de vos itinéraires (même écran qu’ depuis la carte itinéraire).
          </p>
          {loading ? (
            <div className="ios-card p-6 animate-pulse h-24 bg-secondary/80" />
          ) : routes.length === 0 ? (
            <div className="ios-card p-6 text-center text-muted-foreground text-ios-subheadline border border-border/60">
              Aucun itinéraire — créez-en un depuis le hub.
            </div>
          ) : (
            <div className="ios-card overflow-hidden border border-border/60">
              {routes.map((r, i) => (
                <div key={r.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/training/route/${r.id}`)}
                    className="flex w-full min-w-0 items-center gap-3 px-4 py-3 text-left active:bg-secondary min-h-[52px]"
                  >
                    <div className="ios-list-row-icon bg-[#FF2D55]">
                      <Navigation className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[17px] font-medium truncate text-foreground">{r.name}</p>
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
      </ScrollArea>
    </IosFixedPageHeaderShell>
  );
}
