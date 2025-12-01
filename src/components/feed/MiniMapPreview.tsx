import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MiniMapPreviewProps {
  lat: number;
  lng: number;
  profileImageUrl: string;
}

export const MiniMapPreview = ({ lat, lng, profileImageUrl }: MiniMapPreviewProps) => {
  const [mapUrl, setMapUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (lat === undefined || lat === null || lng === undefined || lng === null) {
      setIsLoading(false);
      setError(true);
      return;
    }

    const loadMap = async () => {
      try {
        const { data: apiKeyData } = await supabase.functions.invoke('google-maps-proxy', {
          body: { type: 'get-key' }
        });
        
        const googleMapsApiKey = apiKeyData?.apiKey || '';
        
        if (!googleMapsApiKey) {
          console.error('❌ MiniMapPreview: No API key');
          setError(true);
          setIsLoading(false);
          return;
        }

        // Use Google Maps Static API for simple, reliable image rendering
        const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=14&size=400x200&maptype=roadmap&markers=color:blue%7C${lat},${lng}&key=${googleMapsApiKey}&style=feature:poi%7Celement:labels%7Cvisibility:off`;
        
        setMapUrl(staticMapUrl);
        setIsLoading(false);
      } catch (err) {
        console.error('❌ MiniMapPreview error:', err);
        setError(true);
        setIsLoading(false);
      }
    };

    loadMap();
  }, [lat, lng]);

  if (error) {
    return (
      <div className="w-full h-full rounded-xl bg-muted flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Carte indisponible</span>
      </div>
    );
  }

  if (isLoading || !mapUrl) {
    return (
      <div className="w-full h-full rounded-xl bg-muted animate-pulse flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Chargement...</span>
      </div>
    );
  }

  return (
    <img
      src={mapUrl}
      alt={`Carte de la session à ${lat}, ${lng}`}
      className="w-full h-full object-cover rounded-xl"
      onError={() => setError(true)}
    />
  );
};
