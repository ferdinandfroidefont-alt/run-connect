import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSessionTracking } from '@/hooks/useSessionTracking';
import { Loader } from '@googlemaps/js-api-loader';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { imageUrlToBase64 } from '@/lib/map-marker-generator';

const ROUTE_COLOR = '#FF6B35';

export default function SessionTracking() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const {
    session,
    routeCoordinates,
    participantPositions,
    participantProfiles,
    userPosition,
    loading,
    error,
  } = useSessionTracking(sessionId);

  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const participantMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const [mapReady, setMapReady] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Fetch API key
  useEffect(() => {
    const fetchKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('google-maps-proxy', {
          body: { type: 'get-key' },
        });
        if (error) throw error;
        if (data?.apiKey) setApiKey(data.apiKey);
      } catch (err) {
        console.error('Failed to fetch Google Maps API key:', err);
      }
    };
    fetchKey();
  }, []);

  // Init Google Maps
  useEffect(() => {
    if (!session || !apiKey || mapReady) return;

    const initMap = async () => {
      try {
        if (!(window as any).google?.maps) {
          const loader = new Loader({
            apiKey,
            version: 'weekly',
            libraries: ['geometry', 'places', 'marker'],
          });
          await loader.load();
        }
        if (!mapRef.current) return;

        const center = routeCoordinates.length > 0
          ? undefined
          : { lat: Number(session.location_lat), lng: Number(session.location_lng) };

        const map = new google.maps.Map(mapRef.current, {
          center: center || { lat: 48.8566, lng: 2.3522 },
          zoom: 15,
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: 'greedy',
        });

        // If route exists, draw polyline and fit bounds
        if (routeCoordinates.length > 0) {
          const bounds = new google.maps.LatLngBounds();
          routeCoordinates.forEach(c => bounds.extend(c));
          map.fitBounds(bounds, 60);

          const polyline = new google.maps.Polyline({
            path: routeCoordinates,
            strokeColor: ROUTE_COLOR,
            strokeOpacity: 0.9,
            strokeWeight: 5,
            geodesic: true,
          });
          polyline.setMap(map);
          polylineRef.current = polyline;
        } else {
          map.setCenter({ lat: Number(session.location_lat), lng: Number(session.location_lng) });
        }

        googleMapRef.current = map;
        setMapReady(true);
      } catch (err) {
        console.error('Map init error:', err);
      }
    };

    initMap();
  }, [session, routeCoordinates, apiKey, mapReady]);

  // Create canvas-based blue dot icon for current user
  const createBlueDotIcon = useCallback(() => {
    const size = 60;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 5, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.6)');
    gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.3)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = '#3b82f6';
    ctx.shadowColor = 'rgba(59, 130, 246, 0.8)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 8, 0, 2 * Math.PI);
    ctx.stroke();
    return canvas.toDataURL('image/png');
  }, []);

  // Create a round photo marker via Canvas
  const createPhotoMarkerIcon = useCallback(async (avatarUrl: string | null): Promise<string> => {
    const size = 48;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const radius = size / 2;
    const borderWidth = 3;
    const innerRadius = radius - borderWidth;

    // White circle background with shadow
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(radius, radius, radius - 1, 0, 2 * Math.PI);
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    if (avatarUrl) {
      try {
        const base64 = await imageUrlToBase64(avatarUrl);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject();
          img.src = base64;
        });

        // Clip to circle and draw photo
        ctx.save();
        ctx.beginPath();
        ctx.arc(radius, radius, innerRadius, 0, 2 * Math.PI);
        ctx.clip();
        ctx.drawImage(img, borderWidth, borderWidth, size - borderWidth * 2, size - borderWidth * 2);
        ctx.restore();
      } catch {
        // Fallback: gray circle with user icon
        ctx.fillStyle = '#e0e0e0';
        ctx.beginPath();
        ctx.arc(radius, radius, innerRadius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = '#999';
        ctx.font = `${size * 0.4}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👤', radius, radius);
      }
    } else {
      // No avatar: gray placeholder
      ctx.fillStyle = '#e0e0e0';
      ctx.beginPath();
      ctx.arc(radius, radius, innerRadius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = '#999';
      ctx.font = `${size * 0.4}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👤', radius, radius);
    }

    // White border
    ctx.strokeStyle = 'white';
    ctx.lineWidth = borderWidth;
    ctx.beginPath();
    ctx.arc(radius, radius, innerRadius, 0, 2 * Math.PI);
    ctx.stroke();

    return canvas.toDataURL('image/png');
  }, []);

  // Update user's blue dot
  useEffect(() => {
    if (!googleMapRef.current || !userPosition || !mapReady) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setPosition(userPosition);
    } else {
      const iconUrl = createBlueDotIcon();
      userMarkerRef.current = new google.maps.Marker({
        map: googleMapRef.current,
        position: userPosition,
        icon: {
          url: iconUrl,
          scaledSize: new google.maps.Size(60, 60),
          anchor: new google.maps.Point(30, 30),
        },
        zIndex: 1000,
        title: 'Ma position',
      });
      googleMapRef.current.panTo(userPosition);
      googleMapRef.current.setZoom(16);
    }
  }, [userPosition, mapReady, createBlueDotIcon]);

  // Update participant markers
  useEffect(() => {
    if (!googleMapRef.current || !mapReady) return;
    const map = googleMapRef.current;

    participantPositions.forEach(async (pos, odlUserId) => {
      // skip current user
      if (odlUserId === user?.id) return;

      const existing = participantMarkersRef.current.get(odlUserId);
      if (existing) {
        existing.setPosition({ lat: pos.lat, lng: pos.lng });
      } else {
        const profile = participantProfiles.get(odlUserId);
        const avatarUrl = profile?.avatar_url || pos.avatar_url;
        const iconUrl = await createPhotoMarkerIcon(avatarUrl);
        
        const marker = new google.maps.Marker({
          map,
          position: { lat: pos.lat, lng: pos.lng },
          icon: {
            url: iconUrl,
            scaledSize: new google.maps.Size(48, 48),
            anchor: new google.maps.Point(24, 24),
          },
          zIndex: 500,
          title: profile?.display_name || profile?.username || 'Participant',
        });
        participantMarkersRef.current.set(odlUserId, marker);
      }
    });
  }, [participantPositions, mapReady, user, participantProfiles, createPhotoMarkerIcon]);

  // Cleanup markers on unmount
  useEffect(() => {
    return () => {
      userMarkerRef.current?.setMap(null);
      participantMarkersRef.current.forEach(m => m.setMap(null));
    };
  }, []);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="absolute top-0 left-0 right-0 z-[9999] bg-card pt-[env(safe-area-inset-top)]">
          <div className="flex items-center px-4 py-2 border-b border-border/30">
            <Button variant="ghost" size="sm" onClick={handleBack} className="px-0 font-normal">
              <ArrowLeft className="h-5 w-5 mr-1" />
              Retour
            </Button>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-[15px] text-muted-foreground">Chargement du suivi...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center p-6">
        <div className="absolute top-0 left-0 right-0 z-[9999] bg-card pt-[env(safe-area-inset-top)]">
          <div className="flex items-center px-4 py-2 border-b border-border/30">
            <Button variant="ghost" size="sm" onClick={handleBack} className="px-0 font-normal">
              <ArrowLeft className="h-5 w-5 mr-1" />
              Retour
            </Button>
          </div>
        </div>
        <div className="text-center">
          <p className="text-[17px] text-foreground font-medium mb-2">Erreur</p>
          <p className="text-[15px] text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background">
      {/* Map */}
      <div className="absolute inset-0" style={{ zIndex: 0, isolation: 'isolate' }}>
        <div ref={mapRef} className="w-full h-full bg-secondary" />
      </div>

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-[9999] bg-card pt-[env(safe-area-inset-top)] pointer-events-auto">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="px-0 font-normal"
            style={{ position: 'relative', zIndex: 10000 }}
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            Retour
          </Button>
          <span className="text-[15px] font-semibold text-foreground truncate max-w-[200px]">
            {session?.title || 'Suivi participants'}
          </span>
          <div className="w-16" />
        </div>
      </div>

      {/* Participant count badge */}
      <div className="absolute bottom-8 left-4 z-[9999] pointer-events-none">
        <div className="bg-card/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-border/30">
          <p className="text-[13px] text-muted-foreground">
            {participantPositions.size} participant{participantPositions.size !== 1 ? 's' : ''} en ligne
          </p>
        </div>
      </div>
    </div>
  );
}
