import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';

export interface GalleryPhoto {
  id: string;
  photo_url: string;
  caption: string | null;
  lat: number | null;
  lng: number | null;
  route_id: string;
  route_name: string;
  user_id: string;
  created_at: string;
  photographer: {
    user_id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const findRoutesNearPhoto = async (lat: number, lng: number, radiusKm = 0.5) => {
  const { data: routes, error } = await supabase
    .from('routes')
    .select('*')
    .eq('is_public', true);

  if (error || !routes) return [];

  return routes.filter(route => {
    const coords = route.coordinates as any[];
    if (!Array.isArray(coords)) return false;
    return coords.some((point: any) => {
      let pLat: number, pLng: number;
      if (point?.lat !== undefined && point?.lng !== undefined) {
        pLat = Number(point.lat); pLng = Number(point.lng);
      } else if (Array.isArray(point) && point.length >= 2) {
        pLat = Number(point[0]); pLng = Number(point[1]);
      } else return false;
      return calculateDistance(lat, lng, pLat, pLng) <= radiusKm;
    });
  });
};

export const useRoutePhotosGallery = () => {
  const { user } = useAuth();
  const { position } = useGeolocation();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPhotos = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      setLoading(true);

      const { data: photosData, error } = await supabase
        .from('route_photos')
        .select('*, routes!inner(name, is_public)')
        .eq('routes.is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!photosData?.length) { setPhotos([]); return; }

      const userIds = [...new Set(photosData.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', userIds);

      const gallery: GalleryPhoto[] = photosData.map(p => {
        const prof = profiles?.find(pr => pr.user_id === p.user_id);
        return {
          id: p.id,
          photo_url: p.photo_url,
          caption: p.caption,
          lat: p.lat ? Number(p.lat) : null,
          lng: p.lng ? Number(p.lng) : null,
          route_id: p.route_id,
          route_name: (p as any).routes?.name || 'Itinéraire',
          user_id: p.user_id,
          created_at: p.created_at || '',
          photographer: prof
            ? { user_id: prof.user_id!, username: prof.username || 'user', display_name: prof.display_name || 'Utilisateur', avatar_url: prof.avatar_url }
            : { user_id: p.user_id, username: 'user', display_name: 'Utilisateur', avatar_url: null },
        };
      });

      // Sort by proximity if we have position
      if (position) {
        gallery.sort((a, b) => {
          const dA = a.lat && a.lng ? calculateDistance(position.lat, position.lng, a.lat, a.lng) : Infinity;
          const dB = b.lat && b.lng ? calculateDistance(position.lat, position.lng, b.lat, b.lng) : Infinity;
          return dA - dB;
        });
      }

      setPhotos(gallery);
    } catch (err) {
      console.error('Error loading route photos gallery:', err);
    } finally {
      setLoading(false);
    }
  }, [user, position]);

  useEffect(() => { loadPhotos(); }, [loadPhotos]);

  return { photos, loading, refresh: loadPhotos };
};
