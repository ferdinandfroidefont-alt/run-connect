import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Route, Mountain, Loader2, Bookmark, BookmarkCheck, Map as MapViewIcon, Trash2 } from 'lucide-react';
import { GalleryPhoto, findRoutesNearPhoto, type GalleryMapRoutePreview } from '@/hooks/useRoutePhotosGallery';
import { ActivityIcon } from '@/lib/activityIcons';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { routePhotoStoragePathFromPublicUrl } from '@/lib/routePhotoStorage';

interface RoutePhotoDetailSheetProps {
  photo: GalleryPhoto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Affiche l’itinéraire sur la carte galerie (tracé + photo + position). */
  onViewRouteOnMap?: (route: GalleryMapRoutePreview, contextPhoto: GalleryPhoto) => void;
  onPhotoDeleted?: () => void;
}

const formatDistance = (meters: number | null) => {
  if (!meters) return "N/A";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

export const RoutePhotoDetailSheet = ({
  photo,
  open,
  onOpenChange,
  onViewRouteOnMap,
  onPhotoDeleted,
}: RoutePhotoDetailSheetProps) => {
  const { user } = useAuth();
  const [nearbyRoutes, setNearbyRoutes] = useState<any[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [savedRouteIds, setSavedRouteIds] = useState<Set<string>>(new Set());
  const [savingRouteId, setSavingRouteId] = useState<string | null>(null);

  useEffect(() => {
    if (!photo || !photo.lat || !photo.lng) {
      setNearbyRoutes([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoadingRoutes(true);
      const routes = await findRoutesNearPhoto(photo.lat!, photo.lng!);
      if (!cancelled) setNearbyRoutes(routes);
      setLoadingRoutes(false);
    };
    load();
    return () => { cancelled = true; };
  }, [photo?.id, photo?.lat, photo?.lng]);

  // Load saved status for nearby routes
  useEffect(() => {
    if (!user || nearbyRoutes.length === 0) return;
    const loadSaved = async () => {
      const routeIds = nearbyRoutes.map(r => r.id);
      const { data } = await supabase
        .from('saved_routes')
        .select('route_id')
        .eq('user_id', user.id)
        .in('route_id', routeIds);
      if (data) {
        setSavedRouteIds(new Set(data.map(d => d.route_id)));
      }
    };
    loadSaved();
  }, [user, nearbyRoutes]);

  const deleteOwnPhoto = async () => {
    if (!user || !photo || photo.user_id !== user.id) return;
    try {
      const path = routePhotoStoragePathFromPublicUrl(photo.photo_url);
      if (path) {
        const { error: storageErr } = await supabase.storage.from('route-photos').remove([path]);
        if (storageErr) console.warn('Storage delete route photo:', storageErr);
      }
      const { error } = await supabase.from('route_photos').delete().eq('id', photo.id);
      if (error) throw error;
      toast.success('Photo supprimée');
      onOpenChange(false);
      onPhotoDeleted?.();
    } catch {
      toast.error('Impossible de supprimer la photo');
    }
  };

  const toggleSaveRoute = async (routeId: string) => {
    if (!user) return;
    setSavingRouteId(routeId);
    try {
      if (savedRouteIds.has(routeId)) {
        await supabase
          .from('saved_routes')
          .delete()
          .eq('user_id', user.id)
          .eq('route_id', routeId);
        setSavedRouteIds(prev => {
          const next = new Set(prev);
          next.delete(routeId);
          return next;
        });
        toast.success('Itinéraire retiré');
      } else {
        await supabase
          .from('saved_routes')
          .insert({ user_id: user.id, route_id: routeId });
        setSavedRouteIds(prev => new Set(prev).add(routeId));
        toast.success('Itinéraire enregistré !');
      }
    } catch {
      toast.error('Erreur');
    } finally {
      setSavingRouteId(null);
    }
  };

  if (!photo) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[min(85dvh,820px)] max-h-[90dvh] p-0 gap-0 flex flex-col overflow-hidden border-t border-border"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Détail photo</SheetTitle>
        </SheetHeader>

        {/* Grab indicator + titre (pattern iOS) */}
        <div className="shrink-0 pt-ios-2 pb-ios-1 px-ios-4 border-b border-border/60 bg-background">
          <div className="mx-auto mb-ios-2 h-1 w-10 rounded-full bg-muted-foreground/25" aria-hidden />
          <h2 className="text-ios-title3 font-semibold text-foreground text-center pr-ios-8">
            Photo
          </h2>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {/* Hero photo */}
          <div className="px-ios-4 pt-ios-3">
            <div className="relative w-full overflow-hidden rounded-ios-lg bg-secondary ring-1 ring-black/5 dark:ring-white/10">
              <img
                src={photo.photo_url}
                alt={photo.caption || photo.route_name}
                className="w-full aspect-[4/3] object-cover"
              />
            </div>
          </div>

          <div className="px-ios-4 py-ios-4 space-y-ios-4">
            {/* Photographer — grouped inset */}
            <div className="rounded-ios-lg border border-border bg-card/80 dark:bg-card/60 overflow-hidden p-ios-3">
              <div className="flex items-center gap-ios-3">
                <Avatar className="h-11 w-11 ring-2 ring-border/60">
                  <AvatarImage src={photo.photographer.avatar_url || undefined} />
                  <AvatarFallback className="text-ios-footnote">
                    {photo.photographer.username[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-ios-headline font-semibold truncate">
                    {photo.photographer.display_name || photo.photographer.username}
                  </p>
                  <p className="text-ios-footnote text-muted-foreground truncate">
                    {photo.route_name}
                  </p>
                </div>
              </div>
            </div>

            {photo.caption && (
              <p className="text-ios-subheadline text-foreground leading-relaxed px-ios-1">{photo.caption}</p>
            )}

            {user?.id === photo.user_id && (
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-ios-lg border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={deleteOwnPhoto}
              >
                <Trash2 className="mr-ios-2 h-4 w-4" />
                Supprimer ma photo
              </Button>
            )}

            {/* Nearby routes — liste groupée */}
            <div>
              <h3 className="text-ios-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-ios-2 px-ios-1">
                Itinéraires à proximité
              </h3>

              {loadingRoutes ? (
                <div className="flex items-center justify-center py-ios-6 rounded-ios-lg border border-dashed border-border bg-secondary/40">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : !photo.lat || !photo.lng ? (
                <p className="text-ios-footnote text-muted-foreground py-ios-3 px-ios-1">
                  Position non disponible pour cette photo
                </p>
              ) : nearbyRoutes.length === 0 ? (
                <p className="text-ios-footnote text-muted-foreground py-ios-3 px-ios-1">
                  Aucun itinéraire trouvé à proximité
                </p>
              ) : (
                <div className="rounded-ios-lg border border-border overflow-hidden divide-y divide-border bg-card">
                  {nearbyRoutes.map((route) => {
                    const isSaved = savedRouteIds.has(route.id);
                    const isSaving = savingRouteId === route.id;
                    return (
                      <div
                        key={route.id}
                        className="flex items-stretch gap-0 min-w-0"
                      >
                        <button
                          type="button"
                          className="flex-1 min-w-0 flex items-center gap-ios-3 px-ios-3 py-ios-3 text-left active:bg-secondary/50 transition-colors"
                          onClick={() => {
                            if (!photo || !onViewRouteOnMap) return;
                            onViewRouteOnMap(
                              {
                                id: route.id,
                                name: route.name,
                                coordinates: route.coordinates,
                              },
                              photo
                            );
                            onOpenChange(false);
                          }}
                        >
                          <div className="h-10 w-10 rounded-ios-md bg-primary/10 flex items-center justify-center shrink-0">
                            <ActivityIcon activityType={route.activity_type || 'course'} size="sm" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-ios-headline font-medium truncate">{route.name}</p>
                            <div className="flex flex-wrap items-center gap-x-ios-3 gap-y-0.5 mt-0.5">
                              <span className="flex items-center gap-ios-1 text-ios-caption1 text-muted-foreground">
                                <Route className="h-3 w-3 shrink-0" />
                                {formatDistance(route.total_distance)}
                              </span>
                              {route.total_elevation_gain ? (
                                <span className="flex items-center gap-ios-1 text-ios-caption1 text-muted-foreground">
                                  <Mountain className="h-3 w-3 shrink-0" />
                                  {Math.round(route.total_elevation_gain)} m
                                </span>
                              ) : null}
                              {onViewRouteOnMap && (
                                <span className="flex items-center gap-ios-1 text-ios-caption1 text-primary font-medium">
                                  <MapViewIcon className="h-3 w-3 shrink-0" />
                                  Voir sur la carte
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                        <div className="flex items-center pr-ios-2 border-l border-border/60">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 h-10 w-10 rounded-full"
                            disabled={isSaving}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSaveRoute(route.id);
                            }}
                            aria-label={isSaved ? 'Retirer des enregistrés' : 'Enregistrer l’itinéraire'}
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : isSaved ? (
                              <BookmarkCheck className="h-5 w-5 text-primary fill-primary" />
                            ) : (
                              <Bookmark className="h-5 w-5 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
