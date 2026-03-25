import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { getKeyBody } from '@/lib/googleMapsKey';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ActivityIcon } from '@/lib/activityIcons';
import { ACTIVITY_TYPES } from '@/hooks/useDiscoverFeed';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Star, Route, Mountain, Camera, Copy, Navigation, X, Send, MapPin, Loader2, Images, Trash2,
} from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { getUserLocationMarkerIcon } from '@/lib/mapUserLocationIcon';
import { extractGpsFromImageFile } from '@/lib/exifGps';
import { clientXYToLatLng } from '@/lib/mapLatLngFromPixel';
import { cn } from '@/lib/utils';
import { formatDistanceMeters } from '@/lib/distanceUnits';
import { useDistanceUnit } from '@/contexts/DistanceUnitContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { FeedRoute } from '@/hooks/useRoutesFeed';
import { routePhotoStoragePathFromPublicUrl } from '@/lib/routePhotoStorage';

interface RoutePhoto {
  id: string;
  photo_url: string;
  lat: number | null;
  lng: number | null;
  caption: string | null;
  user_id: string;
  profile?: { display_name: string; avatar_url: string | null };
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
  /** Ouvre directement le flux « ajouter une photo » à l’ouverture. */
  initialAddPhotoMode?: boolean;
  /** Après ouverture + mode ajout photo, déclenche le sélecteur caméra ou galerie une fois. */
  pendingFilePick?: 'camera' | 'gallery' | null;
  onPendingFilePickConsumed?: () => void;
}

export const RouteDetailDialog = ({
  route,
  open,
  onOpenChange,
  onRefresh,
  initialAddPhotoMode = false,
  pendingFilePick = null,
  onPendingFilePickConsumed,
}: RouteDetailDialogProps) => {
  const { user } = useAuth();
  const { distanceUnit } = useDistanceUnit();
  const { position: userGeoPosition } = useGeolocation();
  const navigate = useNavigate();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [photos, setPhotos] = useState<RoutePhoto[]>([]);
  const [ratings, setRatings] = useState<RouteRating[]>([]);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<RoutePhoto | null>(null);

  // Photo upload via map long-press
  const [addPhotoMode, setAddPhotoMode] = useState(false);
  const [pinLocation, setPinLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoCaption, setPhotoCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [readingGps, setReadingGps] = useState(false);
  /** Origine du point sur la carte (EXIF auto ou appui long manuel). */
  const [photoPlacementSource, setPhotoPlacementSource] = useState<'exif' | 'manual' | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const longPressCleanupRef = useRef<(() => void) | null>(null);
  const pinMarkerRef = useRef<google.maps.Marker | null>(null);
  const userLocationMarkerRef = useRef<google.maps.Marker | null>(null);
  const photoFileRef = useRef<File | null>(null);
  const addPhotoStep = !photoFile
    ? 1
    : !pinLocation || readingGps
      ? 2
      : uploading
        ? 3
        : 3;

  useEffect(() => {
    photoFileRef.current = photoFile;
  }, [photoFile]);

  const resetPhotoForm = () => {
    setAddPhotoMode(false);
    setPinLocation(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoCaption('');
    setReadingGps(false);
    setPhotoPlacementSource(null);
    if (pinMarkerRef.current) {
      pinMarkerRef.current.setMap(null);
      pinMarkerRef.current = null;
    }
  };

  const loadDetails = useCallback(async () => {
    if (!route) return;

    const [photosRes, ratingsRes] = await Promise.all([
      supabase.from('route_photos').select('*').eq('route_id', route.id),
      supabase.from('route_ratings').select('*').eq('route_id', route.id).order('created_at', { ascending: false }),
    ]);

    const photosData = (photosRes.data || []) as RoutePhoto[];
    const ratingsData = (ratingsRes.data || []) as RouteRating[];

    // Load profiles for photos & ratings
    const allUserIds = [...new Set([...photosData.map(p => p.user_id), ...ratingsData.map(r => r.user_id)])];
    let profilesMap: Record<string, any> = {};
    if (allUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', allUserIds);
      profiles?.forEach(p => { profilesMap[p.user_id] = p; });
    }

    photosData.forEach(p => {
      const prof = profilesMap[p.user_id];
      if (prof) p.profile = { display_name: prof.display_name || 'Utilisateur', avatar_url: prof.avatar_url };
    });

    ratingsData.forEach(r => {
      const prof = profilesMap[r.user_id];
      if (prof) r.profile = { username: prof.username || 'user', display_name: prof.display_name || 'Utilisateur', avatar_url: prof.avatar_url };
    });

    setPhotos(photosData);
    setRatings(ratingsData);

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
    if (!open) resetPhotoForm();
  }, [open, route, loadDetails]);

  useEffect(() => {
    if (open && initialAddPhotoMode && route) {
      setAddPhotoMode(true);
    }
  }, [open, initialAddPhotoMode, route?.id]);

  useEffect(() => {
    if (!open || !addPhotoMode || !pendingFilePick) return;
    const t = window.setTimeout(() => {
      if (pendingFilePick === 'camera') cameraInputRef.current?.click();
      else galleryInputRef.current?.click();
      onPendingFilePickConsumed?.();
    }, 350);
    return () => clearTimeout(t);
  }, [open, addPhotoMode, pendingFilePick, onPendingFilePickConsumed]);

  // Init map
  useEffect(() => {
    if (!open || !mapContainer.current || !route?.coordinates?.length) return;

    let timer: ReturnType<typeof setTimeout>;

    const initMap = async () => {
      if (!window.google?.maps) {
        try {
          const { data: apiKeyData } = await supabase.functions.invoke('google-maps-proxy', {
            body: getKeyBody()
          });
          const googleMapsApiKey = apiKeyData?.apiKey || '';
          if (!googleMapsApiKey) return;
          const loader = new Loader({ apiKey: googleMapsApiKey, version: 'weekly', libraries: ['geometry'] });
          await loader.importLibrary('maps');
        } catch (e) {
          console.error('Failed to load Google Maps', e);
          return;
        }
      }

      timer = setTimeout(() => {
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
        path, geodesic: true, strokeColor: '#5B7CFF', strokeOpacity: 0.9, strokeWeight: 4, map: mapRef.current,
      });

      // Add photo markers as circles with photo thumbnails
      photos.forEach(photo => {
        if (photo.lat && photo.lng && mapRef.current) {
          const marker = new google.maps.Marker({
            position: { lat: Number(photo.lat), lng: Number(photo.lng) },
            map: mapRef.current,
            icon: {
              url: photo.photo_url,
              scaledSize: new google.maps.Size(40, 40),
              anchor: new google.maps.Point(20, 20),
            },
          });

          // Create a circular border overlay
          new google.maps.Circle({
            center: { lat: Number(photo.lat), lng: Number(photo.lng) },
            radius: 15,
            map: mapRef.current,
            fillColor: '#5B7CFF',
            fillOpacity: 0.15,
            strokeColor: '#5B7CFF',
            strokeWeight: 2,
            clickable: false,
          });

          marker.addListener('click', () => setSelectedPhoto(photo));
        }
      });

      if (userGeoPosition) {
        bounds.extend({ lat: userGeoPosition.lat, lng: userGeoPosition.lng });
        mapRef.current.fitBounds(bounds, 50);
        userLocationMarkerRef.current?.setMap(null);
        userLocationMarkerRef.current = new google.maps.Marker({
          map: mapRef.current,
          position: { lat: userGeoPosition.lat, lng: userGeoPosition.lng },
          icon: getUserLocationMarkerIcon(),
          zIndex: 900,
          title: 'Votre position',
        });
      } else {
        mapRef.current.fitBounds(bounds, 40);
      }
    }, 300);

    };

    initMap();

    return () => {
      if (timer) clearTimeout(timer);
      if (pinMarkerRef.current) {
        pinMarkerRef.current.setMap(null);
        pinMarkerRef.current = null;
      }
      userLocationMarkerRef.current?.setMap(null);
      userLocationMarkerRef.current = null;
      mapRef.current = null;
    };
  }, [open, route, photos, userGeoPosition]);

  // Marqueur de placement : draggable pour corriger avant publication (EXIF ou manuel)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !addPhotoMode || !pinLocation) {
      if (pinMarkerRef.current) {
        pinMarkerRef.current.setMap(null);
        pinMarkerRef.current = null;
      }
      return;
    }

    const pos = { lat: pinLocation.lat, lng: pinLocation.lng };

    if (!pinMarkerRef.current) {
      pinMarkerRef.current = new google.maps.Marker({
        position: pos,
        map,
        draggable: true,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: '#5B7CFF',
          fillOpacity: 0.9,
          strokeColor: '#fff',
          strokeWeight: 3,
        },
        animation: google.maps.Animation.DROP,
        zIndex: google.maps.Marker.MAX_ZINDEX + 10,
      });
      pinMarkerRef.current.addListener('dragend', () => {
        const p = pinMarkerRef.current?.getPosition();
        if (p) {
          setPinLocation({ lat: p.lat(), lng: p.lng() });
          setPhotoPlacementSource('manual');
        }
      });
    } else {
      pinMarkerRef.current.setPosition(pos);
      pinMarkerRef.current.setMap(map);
      pinMarkerRef.current.setDraggable(true);
    }
  }, [pinLocation, addPhotoMode, open, route?.id, photos.length]);

  // Appui long = placement manuel si la photo n’a pas de GPS (ou lecture en cours)
  useEffect(() => {
    if (longPressCleanupRef.current) {
      longPressCleanupRef.current();
      longPressCleanupRef.current = null;
    }

    const map = mapRef.current;
    const allowLongPress = addPhotoMode && !!photoFile && !pinLocation && !readingGps;

    if (!map || !allowLongPress) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let mouseLatLng: google.maps.LatLng | null = null;
    let touchX = 0;
    let touchY = 0;

    const clearTimer = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const placeAt = (latLng: google.maps.LatLng) => {
      if (!photoFileRef.current) return;
      setPinLocation({ lat: latLng.lat(), lng: latLng.lng() });
      setPhotoPlacementSource('manual');
    };

    const subDown = map.addListener('mousedown', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      mouseLatLng = e.latLng;
      clearTimer();
      timer = setTimeout(() => {
        timer = null;
        if (mouseLatLng) placeAt(mouseLatLng);
      }, 550);
    });

    const cancelMouse = () => {
      clearTimer();
      mouseLatLng = null;
    };
    const subUp = map.addListener('mouseup', cancelMouse);
    const subMove = map.addListener('mousemove', cancelMouse);

    const div = map.getDiv();
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touchX = e.touches[0].clientX;
      touchY = e.touches[0].clientY;
      clearTimer();
      timer = setTimeout(() => {
        timer = null;
        const ll = clientXYToLatLng(map, touchX, touchY);
        if (ll) placeAt(ll);
      }, 550);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        clearTimer();
        return;
      }
      const dx = e.touches[0].clientX - touchX;
      const dy = e.touches[0].clientY - touchY;
      if (dx * dx + dy * dy > 144) clearTimer();
    };
    const endTouch = () => clearTimer();
    div.addEventListener('touchstart', onTouchStart, { passive: true });
    div.addEventListener('touchmove', onTouchMove, { passive: true });
    div.addEventListener('touchend', endTouch);
    div.addEventListener('touchcancel', endTouch);

    const cleanup = () => {
      clearTimer();
      google.maps.event.removeListener(subDown);
      google.maps.event.removeListener(subUp);
      google.maps.event.removeListener(subMove);
      div.removeEventListener('touchstart', onTouchStart);
      div.removeEventListener('touchmove', onTouchMove);
      div.removeEventListener('touchend', endTouch);
      div.removeEventListener('touchcancel', endTouch);
    };

    longPressCleanupRef.current = cleanup;
    return cleanup;
  }, [addPhotoMode, photoFile, pinLocation, readingGps, open, route?.id, photos.length]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPinLocation(null);
    setPhotoPlacementSource(null);
    if (pinMarkerRef.current) {
      pinMarkerRef.current.setMap(null);
      pinMarkerRef.current = null;
    }

    setReadingGps(true);
    try {
      const coords = await extractGpsFromImageFile(file);
      if (coords) {
        setPinLocation(coords);
        setPhotoPlacementSource('exif');
        toast.success('Localisation détectée automatiquement');
        setTimeout(() => {
          const m = mapRef.current;
          if (m) {
            m.panTo(coords);
            m.setZoom(Math.max(m.getZoom() || 14, 15));
          }
        }, 100);
      } else {
        toast.info('Aucune position GPS dans la photo', {
          description: 'Maintenez un appui long sur la carte pour placer le point.',
        });
      }
    } catch {
      toast.info('Placement manuel', {
        description: 'Impossible de lire la position dans la photo. Utilisez un appui long sur la carte.',
      });
    } finally {
      setReadingGps(false);
    }
  };

  const handleUploadPhoto = async () => {
    if (!user || !photoFile || !pinLocation || !route) return;
    setUploading(true);
    try {
      const ext = photoFile.name.split('.').pop();
      const filePath = `${user.id}/${route.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('route-photos')
        .upload(filePath, photoFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('route-photos')
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from('route_photos')
        .insert({
          route_id: route.id,
          user_id: user.id,
          photo_url: publicUrl,
          lat: pinLocation.lat,
          lng: pinLocation.lng,
          caption: photoCaption || null,
        });
      if (insertError) throw insertError;

      toast.success('📸 Photo ajoutée sur l\'itinéraire !');
      resetPhotoForm();
      loadDetails();
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

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

  const deleteRoutePhoto = async (photo: RoutePhoto) => {
    if (!user || photo.user_id !== user.id) return;
    try {
      const path = routePhotoStoragePathFromPublicUrl(photo.photo_url);
      if (path) {
        const { error: storageErr } = await supabase.storage.from('route-photos').remove([path]);
        if (storageErr) console.warn('Storage delete route photo:', storageErr);
      }
      const { error } = await supabase.from('route_photos').delete().eq('id', photo.id);
      if (error) throw error;
      if (selectedPhoto?.id === photo.id) setSelectedPhoto(null);
      toast.success('Photo supprimée');
      loadDetails();
      onRefresh?.();
    } catch (e: any) {
      toast.error(e.message || 'Impossible de supprimer la photo');
    }
  };

  const deleteRouteRating = async (r: RouteRating) => {
    if (!user || r.user_id !== user.id) return;
    try {
      const { error } = await supabase.from('route_ratings').delete().eq('id', r.id);
      if (error) throw error;
      toast.success('Avis supprimé');
      loadDetails();
      onRefresh?.();
    } catch (e: any) {
      toast.error(e.message || 'Impossible de supprimer l’avis');
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
        <DialogContent fullScreen hideCloseButton className="p-0 overflow-x-hidden">
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
              <div className="flex items-center justify-between px-4 py-3">
                <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="gap-1 text-primary p-0 h-auto">
                  <ArrowLeft className="h-5 w-5" /> Retour
                </Button>
                {user && (
                  <Button
                    variant={addPhotoMode ? "default" : "ghost"}
                    size="sm"
                    onClick={() => {
                      if (addPhotoMode) resetPhotoForm();
                      else setAddPhotoMode(true);
                    }}
                    className="gap-1.5"
                  >
                    <Camera className="h-4 w-4" />
                    {addPhotoMode ? 'Annuler' : 'Ajouter photo'}
                  </Button>
                )}
              </div>
            </div>

            {/* Mode ajout photo — consignes (auto GPS → validation ; sinon appui long) */}
            {addPhotoMode && (
              <div className="bg-primary/10 border-b border-primary/20 px-4 py-3 flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="text-[13px] text-primary font-medium leading-snug space-y-1">
                  <div className="rounded-xl border border-primary/25 bg-primary/5 p-2 mb-1.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[11px] uppercase tracking-wide font-semibold text-primary/80">
                        Étape {addPhotoStep}/3
                      </p>
                      <p className="text-[11px] text-primary/80">
                        {!photoFile ? 'Choisir photo' : !pinLocation || readingGps ? 'Placer le point' : 'Publier'}
                      </p>
                    </div>
                    <div className="h-1.5 rounded-full bg-primary/15 overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${(addPhotoStep / 3) * 100}%` }}
                      />
                    </div>
                  </div>
                  {!photoFile && (
                    <p>
                      Choisissez une photo via <strong>l’appareil photo</strong> ou la <strong>galerie</strong>. Si elle
                      contient des coordonnées GPS, le point sera proposé automatiquement — vous pourrez le déplacer avant
                      publication.
                    </p>
                  )}
                  {photoFile && readingGps && (
                    <p className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      Analyse de la photo…
                    </p>
                  )}
                  {photoFile && !readingGps && !pinLocation && (
                    <p>
                      <strong>Appui long</strong> sur la carte pour placer la photo à l&apos;endroit souhaité.
                    </p>
                  )}
                  {photoFile && !readingGps && pinLocation && (
                    <p>
                      {photoPlacementSource === 'exif'
                        ? 'Localisation détectée automatiquement — ajustez le marqueur si besoin, puis publiez.'
                        : 'Point placé — déplacez le marqueur sur la carte si besoin, puis publiez.'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Map */}
            <div
              ref={mapContainer}
              className={cn(
                "w-full bg-secondary transition-all",
                addPhotoMode ? "h-[min(82dvh,820px)]" : "h-[min(76dvh,760px)]"
              )}
            />

            {/* Carte d’ajout : photo d’abord, puis position + validation (jamais publiée sans « Publier ») */}
            {addPhotoMode && (
              <div className="mx-4 mt-4 p-4 bg-card rounded-2xl border border-border space-y-3 animate-in slide-in-from-top-2">
                {!photoPreview ? (
                  <>
                    <div className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                      1/3 • Choisir la photo
                    </div>
                    <p className="text-[12px] text-muted-foreground text-center px-1">
                      Deux options : <strong>appareil photo</strong> ou <strong>galerie</strong>. Si la photo contient un GPS,
                      le point est proposé automatiquement ; sinon, <strong>appui long</strong> sur la carte.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-secondary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <Camera className="h-7 w-7" />
                        <span className="text-[13px] font-medium text-foreground text-center px-2">Prendre une photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-secondary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <Images className="h-7 w-7" />
                        <span className="text-[13px] font-medium text-foreground text-center px-2">Galerie</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                      {!pinLocation || readingGps ? '2/3 • Positionner' : '3/3 • Publier'}
                    </div>
                    <div className="relative">
                      <img src={photoPreview} alt="Aperçu" className="w-full h-40 object-cover rounded-xl" />
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 rounded-full"
                        onClick={() => {
                          setPhotoFile(null);
                          setPhotoPreview(null);
                          setPinLocation(null);
                          setPhotoPlacementSource(null);
                          if (pinMarkerRef.current) {
                            pinMarkerRef.current.setMap(null);
                            pinMarkerRef.current = null;
                          }
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={() => cameraInputRef.current?.click()}
                      >
                        <Camera className="h-4 w-4" />
                        Reprendre
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={() => galleryInputRef.current?.click()}
                      >
                        <Images className="h-4 w-4" />
                        Galerie
                      </Button>
                    </div>

                    {pinLocation && (
                      <>
                        <div className="flex items-center gap-2 rounded-xl bg-secondary/60 px-3 py-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <MapPin className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold text-foreground">
                              {photoPlacementSource === 'exif' ? 'Position (GPS photo)' : 'Position (carte)'}
                            </p>
                            <p className="text-[11px] text-muted-foreground font-mono truncate">
                              {pinLocation.lat.toFixed(5)}, {pinLocation.lng.toFixed(5)}
                            </p>
                          </div>
                        </div>

                        <Input
                          placeholder="Légende (facultatif)"
                          value={photoCaption}
                          onChange={(e) => setPhotoCaption(e.target.value)}
                          className="text-[14px]"
                        />

                        <div className="flex gap-2">
                          <Button type="button" variant="outline" onClick={resetPhotoForm} className="flex-1">
                            Annuler
                          </Button>
                          <Button
                            type="button"
                            onClick={handleUploadPhoto}
                            disabled={!photoFile || uploading}
                            className="flex-1 gap-1.5"
                          >
                            <Camera className="h-4 w-4" />
                            {uploading ? 'Publication…' : 'Publier'}
                          </Button>
                        </div>
                      </>
                    )}
                  </>
                )}
                {/* Une seule paire d’inputs fichier (caméra + galerie) pour les deux étapes */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            )}

            <div className="p-4 space-y-6 pb-24 overflow-x-hidden">
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
                  <span className="font-semibold">
                    {route.total_distance != null && route.total_distance > 0
                      ? formatDistanceMeters(route.total_distance, distanceUnit)
                      : 'N/A'}
                  </span>
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
                      <div key={photo.id} className="shrink-0 relative group">
                        <img
                          src={photo.photo_url}
                          alt={photo.caption || 'Photo'}
                          className="h-24 w-24 object-cover rounded-2xl cursor-pointer active:opacity-80 ring-2 ring-border"
                          onClick={() => setSelectedPhoto(photo)}
                        />
                        {user?.id === photo.user_id && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-7 w-7 rounded-full shadow-md"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteRoutePhoto(photo);
                            }}
                            aria-label="Supprimer la photo"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {photo.caption && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 rounded-b-2xl px-1.5 py-0.5">
                            <p className="text-[10px] text-white truncate">{photo.caption}</p>
                          </div>
                        )}
                      </div>
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
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={r.profile?.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">{r.profile?.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                        </Avatar>
                        <span className="text-[14px] font-medium min-w-0 flex-1 truncate">{r.profile?.display_name || 'Utilisateur'}</span>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star key={i} className={cn("h-3 w-3", i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30")} />
                          ))}
                        </div>
                        {user?.id === r.user_id && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteRouteRating(r)}
                            aria-label="Supprimer mon avis"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
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

      {/* Photo lightbox with details */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center"
          onClick={() => setSelectedPhoto(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white z-10"
            onClick={() => setSelectedPhoto(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          {user?.id === selectedPhoto.user_id && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 left-4 text-white z-10"
              onClick={(e) => {
                e.stopPropagation();
                deleteRoutePhoto(selectedPhoto);
              }}
              aria-label="Supprimer la photo"
            >
              <Trash2 className="h-6 w-6" />
            </Button>
          )}
          <img src={selectedPhoto.photo_url} alt="Photo" className="max-w-[90vw] max-h-[70vh] object-contain rounded-lg" />
          {(selectedPhoto.caption || selectedPhoto.profile) && (
            <div className="mt-4 text-center px-6" onClick={e => e.stopPropagation()}>
              {selectedPhoto.caption && (
                <p className="text-white text-[15px] mb-1">{selectedPhoto.caption}</p>
              )}
              {selectedPhoto.profile && (
                <p className="text-white/60 text-[13px]">par {selectedPhoto.profile.display_name}</p>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};
