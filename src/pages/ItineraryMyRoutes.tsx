import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, PenLine, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IosFixedPageHeaderShell } from '@/components/layout/IosFixedPageHeaderShell';
import { IosPageHeaderBar } from '@/components/layout/IosPageHeaderBar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RouteCard } from '@/components/RouteCard';
import { useMyRoutesList } from '@/hooks/useMyRoutesList';
import { useAuth } from '@/hooks/useAuth';

type ItineraryMyRoutesLocationState = {
  /** Cible du bouton Retour (ex. `/route-creation` depuis l’éditeur de carte). */
  itineraryBackTo?: string;
};

export default function ItineraryMyRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const itineraryBackTo =
    (location.state as ItineraryMyRoutesLocationState | null)?.itineraryBackTo ?? '/itinerary';
  const { user } = useAuth();
  const { routes, loading } = useMyRoutesList();

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
                  onClick={() => navigate(itineraryBackTo)}
                  className="inline-flex items-center gap-1 text-[17px] font-medium text-primary"
                >
                  <ArrowLeft className="h-5 w-5 shrink-0" />
                  Retour
                </button>
              }
              title="Mes itinéraires"
            />
          </div>
        }
      >
        <ScrollArea className="h-full min-h-0 min-w-0 flex-1 overflow-x-hidden [&>div>div[style]]:!overflow-y-auto [&_.scrollbar]:hidden [&>div>div+div]:hidden">
          <div className="min-w-0 max-w-full overflow-x-hidden py-4 pb-24">
            <div className="mx-auto box-border min-w-0 w-full max-w-full px-4 ios-shell:px-2.5 sm:max-w-2xl">
            {!user ? (
              <p className="text-ios-subheadline text-muted-foreground text-center py-8">Connectez-vous pour voir vos itinéraires.</p>
            ) : loading ? (
              <div className="ios-list-stack">
                {[1, 2].map((i) => (
                  <div key={i} className="ios-card p-ios-4 animate-pulse">
                    <div className="h-4 bg-secondary rounded w-3/4 mb-2" />
                    <div className="h-3 bg-secondary rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : routes.length === 0 ? (
              <div className="ios-card border border-border/60 p-8 text-center">
                <MapPin className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                <p className="mb-ios-1 text-ios-headline font-medium text-foreground">Aucun itinéraire</p>
                <p className="mb-ios-4 text-ios-subheadline text-muted-foreground">Tracez un parcours sur la carte</p>
                <Button onClick={() => navigate('/route-create')} className="rounded-full">
                  <Plus className="mr-ios-2 h-4 w-4" />
                  Créer un itinéraire
                </Button>
              </div>
            ) : (
              <div className="ios-list-stack">
                <div className="ios-card flex items-center justify-between gap-3 border border-border/60 border-primary/25 bg-primary/[0.07] p-ios-4">
                  <div className="min-w-0 text-left">
                    <p className="text-ios-subheadline font-semibold text-foreground">Nouveau tracé</p>
                    <p className="mt-0.5 text-ios-footnote text-muted-foreground">Ouvrir l’éditeur de carte</p>
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0 rounded-full"
                    onClick={() => navigate('/route-create')}
                  >
                    <PenLine className="mr-ios-1 h-4 w-4" />
                    Créer
                  </Button>
                </div>
                {routes.map((route) => (
                  <RouteCard key={route.id} route={route} />
                ))}
              </div>
            )}
            </div>
          </div>
        </ScrollArea>
      </IosFixedPageHeaderShell>
    </>
  );
}
