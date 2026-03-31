import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { IosFixedPageHeaderShell } from '@/components/layout/IosFixedPageHeaderShell';
import { IosPageHeaderBar } from '@/components/layout/IosPageHeaderBar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RoutesFeedFilters } from '@/components/routes-feed/RoutesFeedFilters';
import { RoutesFeedCard } from '@/components/routes-feed/RoutesFeedCard';
import { useRoutesFeed, type FeedRoute } from '@/hooks/useRoutesFeed';

const RouteDetailDialog = lazy(() =>
  import('@/components/routes-feed/RouteDetailDialog').then((m) => ({ default: m.RouteDetailDialog }))
);

export default function ItineraryFeed() {
  const navigate = useNavigate();
  const routesFeed = useRoutesFeed();
  const { position: mapUserPosition, getCurrentPosition } = useGeolocation();
  const [selectedFeedRoute, setSelectedFeedRoute] = useState<FeedRoute | null>(null);
  const [showRouteDetail, setShowRouteDetail] = useState(false);

  useEffect(() => {
    void getCurrentPosition();
  }, [getCurrentPosition]);

  const bumpAfterMutation = useCallback(() => {
    routesFeed.refresh();
  }, [routesFeed.refresh]);

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
              title="Feed itinéraire"
            />
          </div>
        }
      >
        <ScrollArea className="h-full min-h-0 flex-1 [&>div>div[style]]:!overflow-y-auto [&_.scrollbar]:hidden [&>div>div+div]:hidden">
          <div className="space-y-ios-3 px-ios-4 py-4 pb-24">
            <RoutesFeedFilters
              maxProximity={routesFeed.maxProximity}
              setMaxProximity={routesFeed.setMaxProximity}
              maxRouteDistance={routesFeed.maxRouteDistance}
              setMaxRouteDistance={routesFeed.setMaxRouteDistance}
              minRating={routesFeed.minRating}
              setMinRating={routesFeed.setMinRating}
              selectedActivities={routesFeed.selectedActivities}
              toggleActivity={routesFeed.toggleActivity}
              toggleAllActivities={routesFeed.toggleAllActivities}
            />
            {routesFeed.loading ? (
              <div className="space-y-ios-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="ios-card rounded-ios-lg border border-border overflow-hidden animate-pulse"
                  >
                    <div className="h-40 bg-secondary" />
                    <div className="p-ios-4 space-y-ios-2">
                      <div className="h-4 bg-secondary rounded-ios-sm w-3/4" />
                      <div className="h-3 bg-secondary rounded-ios-sm w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : routesFeed.routes.length === 0 ? (
              <div className="ios-card rounded-ios-lg p-ios-8 text-center border border-border">
                <div className="mb-ios-4 inline-flex p-ios-4 rounded-full bg-secondary">
                  <MapPin className="h-10 w-10 text-muted-foreground" />
                </div>
                <p className="text-ios-headline font-semibold text-foreground mb-ios-1">Aucun itinéraire trouvé</p>
                <p className="text-ios-subheadline text-muted-foreground leading-relaxed">
                  {routesFeed.hasLocation
                    ? 'Aucun itinéraire public ne correspond à vos filtres dans cette zone.'
                    : 'Activez la localisation pour voir les itinéraires proches de vous.'}
                </p>
              </div>
            ) : (
              <div className="space-y-ios-3">
                {routesFeed.routes.map((route, i) => (
                  <RoutesFeedCard
                    key={route.id}
                    route={route}
                    index={i}
                    mapUserPosition={mapUserPosition}
                    onClick={(r) => {
                      setSelectedFeedRoute(r);
                      setShowRouteDetail(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </IosFixedPageHeaderShell>

      <Suspense fallback={null}>
        <RouteDetailDialog
          route={selectedFeedRoute}
          open={showRouteDetail}
          onOpenChange={setShowRouteDetail}
          onRefresh={bumpAfterMutation}
        />
      </Suspense>
    </>
  );
}
