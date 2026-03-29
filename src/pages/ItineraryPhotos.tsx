import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Images } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IosFixedPageHeaderShell } from '@/components/layout/IosFixedPageHeaderShell';
import { IosPageHeaderBar } from '@/components/layout/IosPageHeaderBar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRoutesFeed, type FeedRoute } from '@/hooks/useRoutesFeed';
import { useToast } from '@/hooks/use-toast';

const RouteDetailDialog = lazy(() =>
  import('@/components/routes-feed/RouteDetailDialog').then((m) => ({ default: m.RouteDetailDialog }))
);
const RoutePhotosGallery = lazy(() =>
  import('@/components/routes-feed/RoutePhotosGallery').then((m) => ({ default: m.RoutePhotosGallery }))
);

export default function ItineraryPhotos() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const routesFeed = useRoutesFeed();
  const [photosTabRouteId, setPhotosTabRouteId] = useState('');
  const [routePhotosSyncKey, setRoutePhotosSyncKey] = useState(0);
  const [selectedFeedRoute, setSelectedFeedRoute] = useState<FeedRoute | null>(null);
  const [showRouteDetail, setShowRouteDetail] = useState(false);
  const [openWithPhoto, setOpenWithPhoto] = useState(false);
  const [pendingPick, setPendingPick] = useState<'camera' | 'gallery' | null>(null);

  useEffect(() => {
    routesFeed.refresh();
  }, [routesFeed.refresh]);

  const bump = useCallback(() => {
    routesFeed.refresh();
    setRoutePhotosSyncKey((n) => n + 1);
  }, [routesFeed.refresh]);

  const openFromPhotos = (source: 'camera' | 'gallery') => {
    const r = routesFeed.routes.find((x) => x.id === photosTabRouteId);
    if (!r) {
      toast({
        title: 'Choisir un itinéraire',
        description: 'Sélectionnez un itinéraire dans la liste (identique au feed).',
      });
      return;
    }
    setSelectedFeedRoute(r);
    setOpenWithPhoto(true);
    setPendingPick(source);
    setShowRouteDetail(true);
  };

  const clearPick = useCallback(() => setPendingPick(null), []);

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
              title="Photos"
            />
          </div>
        }
      >
        <ScrollArea className="h-full min-h-0 min-w-0 flex-1 overflow-x-hidden [&>div>div[style]]:!overflow-y-auto [&_.scrollbar]:hidden [&>div>div+div]:hidden">
          <div className="min-w-0 max-w-full overflow-x-hidden py-4 pb-24">
            <div className="mx-auto box-border min-w-0 w-full max-w-full space-y-ios-3 px-4 ios-shell:px-2.5 sm:max-w-2xl">
            <div className="ios-card rounded-ios-lg border border-border p-ios-3">
              <p className="text-ios-footnote font-semibold text-foreground uppercase tracking-wide mb-ios-2">
                Ajouter une photo
              </p>
              <p className="text-ios-caption1 text-muted-foreground mb-ios-3 leading-relaxed">
                Choisissez un itinéraire public (même liste que le feed), puis ouvrez l’appareil photo ou la galerie.
              </p>
              <div className="mb-ios-3">
                {routesFeed.loading ? (
                  <p className="text-ios-caption1 text-muted-foreground py-ios-2">Chargement des itinéraires…</p>
                ) : routesFeed.routes.length === 0 ? (
                  <p className="text-ios-caption1 text-muted-foreground py-ios-2 leading-relaxed">
                    Aucun itinéraire pour l’instant — ouvrez le feed ou activez la localisation.
                  </p>
                ) : (
                  <Select value={photosTabRouteId || undefined} onValueChange={(v) => setPhotosTabRouteId(v)}>
                    <SelectTrigger className="w-full rounded-ios-md border-border bg-background text-ios-footnote h-11">
                      <SelectValue placeholder="Itinéraire du feed…" />
                    </SelectTrigger>
                    <SelectContent>
                      {routesFeed.routes.map((r) => (
                        <SelectItem key={r.id} value={r.id} className="text-ios-footnote">
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="grid grid-cols-2 gap-ios-2 mb-ios-2">
                <button
                  type="button"
                  onClick={() => openFromPhotos('camera')}
                  className="rounded-ios-md border border-border bg-secondary/50 px-ios-2 py-ios-3 flex flex-col items-center justify-center gap-ios-1 min-h-[88px] active:opacity-80"
                >
                  <Camera className="h-5 w-5 text-primary shrink-0" />
                  <span className="text-ios-footnote font-medium text-foreground text-center">Appareil photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => openFromPhotos('gallery')}
                  className="rounded-ios-md border border-border bg-secondary/50 px-ios-2 py-ios-3 flex flex-col items-center justify-center gap-ios-1 min-h-[88px] active:opacity-80"
                >
                  <Images className="h-5 w-5 text-primary shrink-0" />
                  <span className="text-ios-footnote font-medium text-foreground text-center">Galerie</span>
                </button>
              </div>
              <Button type="button" variant="outline" className="w-full" onClick={() => navigate('/itinerary/feed')}>
                Ouvrir le feed
              </Button>
            </div>
            <Suspense fallback={null}>
              <RoutePhotosGallery syncKey={routePhotosSyncKey} />
            </Suspense>
            </div>
          </div>
        </ScrollArea>
      </IosFixedPageHeaderShell>

      <Suspense fallback={null}>
        <RouteDetailDialog
          route={selectedFeedRoute}
          open={showRouteDetail}
          onOpenChange={(open) => {
            setShowRouteDetail(open);
            if (!open) {
              setOpenWithPhoto(false);
              setPendingPick(null);
            }
          }}
          onRefresh={bump}
          initialAddPhotoMode={openWithPhoto}
          pendingFilePick={pendingPick}
          onPendingFilePickConsumed={clearPick}
        />
      </Suspense>
    </>
  );
}
