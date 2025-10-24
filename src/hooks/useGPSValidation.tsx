import { useState } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { Device } from '@capacitor/device';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ValidationResult {
  success: boolean;
  distance?: number;
  error?: string;
}

export const useGPSValidation = () => {
  const [validating, setValidating] = useState(false);
  const { toast } = useToast();

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const validatePresence = async (
    sessionId: string,
    sessionLat: number,
    sessionLng: number,
    scheduledAt: string,
    userId: string
  ): Promise<ValidationResult> => {
    setValidating(true);

    try {
      const permissions = await Geolocation.checkPermissions();
      if (permissions.location !== 'granted') {
        const request = await Geolocation.requestPermissions();
        if (request.location !== 'granted') {
          throw new Error("❌ Permission de géolocalisation refusée");
        }
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });

      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;
      const distance = calculateDistance(userLat, userLng, sessionLat, sessionLng);

      if (distance > 80) {
        throw new Error(`❌ Tu es trop éloigné du point de départ (${Math.round(distance)}m)`);
      }

      const now = new Date();
      const sessionTime = new Date(scheduledAt);
      const timeDiffMinutes = Math.abs(now.getTime() - sessionTime.getTime()) / 60000;

      if (timeDiffMinutes > 10) {
        throw new Error(`❌ Validation GPS disponible uniquement 10 min avant/après l'heure prévue`);
      }

      const deviceInfo = await Device.getId();
      const deviceId = deviceInfo.identifier;

      const { data: existingValidation } = await supabase
        .from('session_participants')
        .select('user_id, profiles!inner(username, display_name)')
        .eq('session_id', sessionId)
        .eq('device_id', deviceId)
        .eq('confirmed_by_gps', true);

      if (existingValidation && existingValidation.length > 0) {
        throw new Error(`❌ Ce téléphone a déjà validé un autre compte pour cette séance`);
      }

      const { error: updateError } = await supabase
        .from('session_participants')
        .update({
          confirmed_by_gps: true,
          gps_validation_time: new Date().toISOString(),
          gps_lat: userLat,
          gps_lng: userLng,
          device_id: deviceId
        })
        .eq('session_id', sessionId)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      await supabase.rpc('increment_user_sessions_joined', { user_id_param: userId });

      return { 
        success: true, 
        distance: Math.round(distance) 
      };

    } catch (error: any) {
      return { 
        success: false, 
        error: error.message 
      };
    } finally {
      setValidating(false);
    }
  };

  return { validatePresence, validating };
};
