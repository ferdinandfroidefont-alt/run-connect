import { useNavigate } from 'react-router-dom';
import { Navigation, ChevronRight } from 'lucide-react';
import { IosFixedPageHeaderShell } from '@/components/layout/IosFixedPageHeaderShell';
import { IosPageHeaderBar } from '@/components/layout/IosPageHeaderBar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMyRoutesList } from '@/hooks/useMyRoutesList';

export default function ItineraryTraining() {
  const navigate = useNavigate();
  const { routes, loading } = useMyRoutesList();

  return (
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
            title="Entraînement"
          />
        </div>
      }
    >
      <ScrollArea className="h-full min-h-0 min-w-0 flex-1 overflow-x-hidden [&>div>div[style]]:!overflow-y-auto [&_.scrollbar]:hidden [&>div>div+div]:hidden">
        <div className="min-w-0 max-w-full overflow-x-hidden py-4 pb-24">
          <div className="mx-auto box-border min-w-0 w-full max-w-full space-y-3 px-4 ios-shell:px-2.5 sm:max-w-2xl">
            <p className="text-ios-subheadline leading-relaxed text-muted-foreground">
              Ouvrez le mode entraînement pour un de vos itinéraires (même écran qu’ depuis la carte itinéraire).
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
                      onClick={() => navigate(`/training/route/${r.id}`)}
                      className="flex min-h-[52px] w-full min-w-0 max-w-full items-center gap-3 px-4 py-3 text-left active:bg-secondary ios-shell:px-2.5"
                    >
                      <div className="ios-list-row-icon shrink-0 bg-[#FF2D55]">
                        <Navigation className="h-4 w-4 text-white" />
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
  );
}
