import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Route, Mountain, Loader2, Bookmark, BookmarkCheck } from 'lucide-react';
import { GalleryPhoto, findRoutesNearPhoto } from '@/hooks/useRoutePhotosGallery';
import { ActivityIcon } from '@/lib/activityIcons';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface RoutePhotoDetailSheetProps {
  photo: GalleryPhoto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatDistance = (meters: number | null) => {
  if (!meters) return "N/A";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

export const RoutePhotoDetailSheet = ({ photo, open, onOpenChange }: RoutePhotoDetailSheetProps) => {
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
  }, [photo?.id]);

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
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0 overflow-y-auto">
        <SheetHeader className="sr-only">
          <SheetTitle>Détail photo</SheetTitle>
        </SheetHeader>
        
        {/* Full photo */}
        <div className="relative w-full aspect-[4/3] bg-secondary">
          <img
            src={photo.photo_url}
            alt={photo.caption || photo.route_name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="p-4 space-y-4">
          {/* Photographer */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={photo.photographer.avatar_url || undefined} />
              <AvatarFallback>
                {photo.photographer.username[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-[15px] font-semibold">
                {photo.photographer.display_name || photo.photographer.username}
              </p>
              <p className="text-[13px] text-muted-foreground">
                sur {photo.route_name}
              </p>
            </div>
          </div>

          {/* Caption */}
          {photo.caption && (
            <p className="text-[15px] text-foreground">{photo.caption}</p>
          )}

          {/* Nearby routes */}
          <div>
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Itinéraires à proximité
            </h3>

            {loadingRoutes ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !photo.lat || !photo.lng ? (
              <p className="text-[13px] text-muted-foreground py-3">
                Position non disponible pour cette photo
              </p>
            ) : nearbyRoutes.length === 0 ? (
              <p className="text-[13px] text-muted-foreground py-3">
                Aucun itinéraire trouvé à proximité
              </p>
            ) : (
              <div className="space-y-0 divide-y divide-border rounded-xl overflow-hidden border border-border">
                {nearbyRoutes.map(route => {
                  const isSaved = savedRouteIds.has(route.id);
                  const isSaving = savingRouteId === route.id;
                  return (
                    <div key={route.id} className="p-3 bg-card flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <ActivityIcon activityType={route.activity_type || 'course'} size="sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-medium truncate">{route.name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                            <Route className="h-3 w-3" />
                            {formatDistance(route.total_distance)}
                          </span>
                          {route.total_elevation_gain && (
                            <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                              <Mountain className="h-3 w-3" />
                              {Math.round(route.total_elevation_gain)} m
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-9 w-9"
                        disabled={isSaving}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSaveRoute(route.id);
                        }}
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
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
