import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ActivityIcon } from '@/lib/activityIcons';
import { ACTIVITY_TYPES } from '@/hooks/useDiscoverFeed';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Star, Route, Mountain, Camera, Copy, Navigation, X, Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { FeedRoute } from '@/hooks/useRoutesFeed';

interface RoutePhoto {
  id: string;
  photo_url: string;
  lat: number | null;
  lng: number | null;
  caption: string | null;
  user_id: string;
}

interface RouteRating {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profile?: { username: string; display_name: string; avatar_url: string | null };
}

interface RouteDetailDialogProps {
  route: FeedRoute | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh?: () => void;
}

const formatDistance = (meters: number | null) => {
  if (!meters) return "N/A";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

export const RouteDetailDialog = ({ route, open, onOpenChange, onRefresh }: RouteDetailDialogProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [photos, setPhotos] = useState<RoutePhoto[]>([]);
  const [ratings, setRatings] = useState<RouteRating[]>([]);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const loadDetails = useCallback(async () => {
    if (!route) return;

    const [photosRes, ratingsRes] = await Promise.all([
      supabase.from('route_photos').select('*').eq('route_id', route.id),
      supabase.from('route_ratings').select('*').eq('route_id', route.id).order('created_at', { ascending: false }),
    ]);

    setPhotos((photosRes.data || []) as RoutePhoto[]);

    const ratingsData = (ratingsRes.data || []) as RouteRating[];
    // Load profiles for ratings
    const userIds = [...new Set(ratingsData.map(r => r.user_id))];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', userIds);

      ratingsData.forEach(r => {
        const p = profiles?.find(pr => pr.user_id === r.user_id);
        if (p) r.profile = { username: p.username || 'user', display_name: p.display_name || 'Utilisateur', avatar_url: p.avatar_url };
      });
    }

    setRatings(ratingsData);

    // Set my existing rating
    const myExisting = ratingsData.find(r => r.user_id === user?.id);
    if (myExisting) {
      setMyRating(myExisting.rating);
      setMyComment(myExisting.comment || '');
    } else {
      setMyRating(0);
      setMyComment('');
    }
  }, [route, user]);

  useEffect(() => {
    if (open && route) loadDetails();
  }, [open, route, loadDetails]);

  // Init map
  useEffect(() => {
    if (!open || !mapContainer.current || !window.google || !route?.coordinates?.length) return;

    const timer = setTimeout(() => {
      if (!mapContainer.current) return;
      const path = route.coordinates.map((coord: any) => {
        if (coord.lat !== undefined && coord.lng !== undefined) return { lat: Number(coord.lat), lng: Number(coord.lng) };
        if (Array.isArray(coord) && coord.length >= 2) return { lat: Number(coord[0]), lng: Number(coord[1]) };
        return null;
      }).filter(Boolean);

      if (path.length === 0) return;

      const bounds = new google.maps.LatLngBounds();
      path.forEach((c: any) => bounds.extend(c));

      mapRef.current = new google.maps.Map(mapContainer.current, {
        center: bounds.getCenter(),
        zoom: 10,
        mapTypeId: 'terrain',
        disableDefaultUI: false,
        gestureHandling: 'greedy',
      });

      new google.maps.Polyline({
        path, geodesic: true, strokeColor: '#ef4444', strokeOpacity: 0.9, strokeWeight: 4, map: mapRef.current,
      });

      // Add photo markers
      photos.forEach(photo => {
        if (photo.lat && photo.lng && mapRef.current) {
          const marker = new google.maps.Marker({
            position: { lat: Number(photo.lat), lng: Number(photo.lng) },
            map: mapRef.current,
            icon: {
              url: photo.photo_url,
              scaledSize: new google.maps.Size(36, 36),
              anchor: new google.maps.Point(18, 18),
            },
          });
          marker.addListener('click', () => setSelectedPhoto(photo.photo_url));
        }
      });

      mapRef.current.fitBounds(bounds, 40);
    }, 300);

    return () => { clearTimeout(timer); mapRef.current = null; };
  }, [open, route, photos]);

  const submitRating = async () => {
    if (!user || !route || myRating === 0) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('route_ratings')
        .upsert({
          route_id: route.id,
          user_id: user.id,
          rating: myRating,
          comment: myComment || null,
        }, { onConflict: 'route_id,user_id' });

      if (error) throw error;
      toast.success('Avis enregistré !');
      loadDetails();
      onRefresh?.();
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const copyRoute = async () => {
    if (!user || !route) return;
    try {
      const { error } = await supabase.from('routes').insert({
        name: `${route.name} (copie)`,
        description: route.description,
        coordinates: route.coordinates,
        total_distance: route.total_distance,
        total_elevation_gain: route.total_elevation_gain,
        created_by: user.id,
        activity_type: route.activity_type,
      });
      if (error) throw error;
      toast.success('Itinéraire copié dans vos itinéraires !');
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    }
  };

  if (!route) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent fullScreen hideCloseButton className="p-0">
          <div className="flex-1 overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
              <div className="flex items-center justify-between px-4 py-3">
                <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="gap-1 text-primary p-0 h-auto">
                  <ArrowLeft className="h-5 w-5" /> Retour
                </Button>
              </div>
            </div>

            {/* Map */}
            <div ref={mapContainer} className="w-full h-64 bg-secondary" />

            <div className="p-4 space-y-6 pb-24">
              {/* Route info */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="gap-1">
                    <ActivityIcon activityType={route.activity_type} size="sm" />
                    {ACTIVITY_TYPES.find(a => a.value === route.activity_type)?.label}
                  </Badge>
                </div>
                <h2 className="text-[22px] font-bold">{route.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={route.creator.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]">{route.creator.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-[14px] text-muted-foreground">par {route.creator.display_name}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5 text-[15px]">
                  <Route className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{formatDistance(route.total_distance)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[15px]">
                  <Mountain className="h-4 w-4 text-muted-foreground" />
                  <span>{route.total_elevation_gain ? `${Math.round(route.total_elevation_gain)} m D+` : 'N/A'}</span>
                </div>
              </div>

              {route.description && (
                <p className="text-[15px] text-muted-foreground">{route.description}</p>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={copyRoute} variant="outline" className="flex-1 gap-2">
                  <Copy className="h-4 w-4" /> Copier l'itinéraire
                </Button>
                <Button onClick={() => { onOpenChange(false); navigate(`/training/route/${route.id}`); }} className="flex-1 gap-2">
                  <Navigation className="h-4 w-4" /> Entraînement
                </Button>
              </div>

              {/* Photos */}
              {photos.length > 0 && (
                <div>
                  <h3 className="text-[17px] font-semibold mb-3 flex items-center gap-2">
                    <Camera className="h-5 w-5" /> Photos ({photos.length})
                  </h3>
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
                    {photos.map(photo => (
                      <img
                        key={photo.id}
                        src={photo.photo_url}
                        alt={photo.caption || 'Photo'}
                        className="h-24 w-24 object-cover rounded-xl shrink-0 cursor-pointer active:opacity-80"
                        onClick={() => setSelectedPhoto(photo.photo_url)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Rating form */}
              <div className="bg-secondary rounded-xl p-4 space-y-3">
                <h3 className="text-[17px] font-semibold">Votre avis</h3>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <button key={i} onClick={() => setMyRating(i + 1)}>
                      <Star className={cn("h-7 w-7", i < myRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30")} />
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder="Commentaire (optionnel)"
                  value={myComment}
                  onChange={e => setMyComment(e.target.value)}
                  className="bg-card"
                />
                <Button onClick={submitRating} disabled={myRating === 0 || submitting} className="w-full gap-2">
                  <Send className="h-4 w-4" /> Envoyer
                </Button>
              </div>

              {/* Existing ratings */}
              {ratings.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[17px] font-semibold">Avis ({ratings.length})</h3>
                  {ratings.map(r => (
                    <div key={r.id} className="bg-card rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={r.profile?.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">{r.profile?.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                        </Avatar>
                        <span className="text-[14px] font-medium">{r.profile?.display_name || 'Utilisateur'}</span>
                        <div className="flex items-center gap-0.5 ml-auto">
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star key={i} className={cn("h-3 w-3", i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30")} />
                          ))}
                        </div>
                      </div>
                      {r.comment && <p className="text-[14px] text-muted-foreground">{r.comment}</p>}
                      <p className="text-[12px] text-muted-foreground/60">{format(new Date(r.created_at), 'dd MMM yyyy', { locale: fr })}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => setSelectedPhoto(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white"
            onClick={() => setSelectedPhoto(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          <img src={selectedPhoto} alt="Photo" className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg" />
        </div>
      )}
    </>
  );
};
