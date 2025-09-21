import { useState, useCallback } from 'react';
import { Position, GeolocationPermissions } from '@/types/permissions';
import { Geolocation } from '@capacitor/geolocation';
import { detectNativeAndroid } from '@/lib/detectNativeAndroid';

export const useGeolocation = () => {
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);

  const checkPermissions = async (): Promise<GeolocationPermissions> => {
    try {
      const result = await Geolocation.checkPermissions();
      return { 
        location: result.location, 
        coarseLocation: result.coarseLocation || result.location 
      };
    } catch (error) {
      console.log('Erreur check permissions:', error);
      return { location: 'prompt', coarseLocation: 'prompt' };
    }
  };

  const requestPermissions = async (): Promise<GeolocationPermissions> => {
    try {
      const result = await Geolocation.requestPermissions();
      return { 
        location: result.location, 
        coarseLocation: result.coarseLocation || result.location 
      };
    } catch (error) {
      console.log('Erreur request permissions:', error);
      return { location: 'denied', coarseLocation: 'denied' };
    }
  };

  const getCurrentPosition = useCallback(async (): Promise<Position | null> => {
    setLoading(true);
    
    try {
      console.log('🚀 GÉOLOCALISATION - Demande de position');
      
      // Toujours demander les permissions d'abord
      const permissions = await Geolocation.requestPermissions();
      console.log('📱 Permissions obtenues:', permissions);
      
      if (permissions.location !== 'granted') {
        throw new Error(`Permission géolocalisation refusée: ${permissions.location}`);
      }

      // Obtenir la position avec un timeout plus court
      console.log('📱 Demande de position en cours...');
      const result = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000, // 10 secondes max
        maximumAge: 300000 // 5 minutes de cache max
      });
      
      console.log('📱 ✅ Position obtenue:', result);
      
      const pos = {
        lat: result.coords.latitude,
        lng: result.coords.longitude
      };
      
      setPosition(pos);
      return pos;
      
    } catch (error) {
      console.error('🚀 ❌ ERREUR GÉOLOCALISATION:', error);
      
      // Fallback vers l'API web si Capacitor échoue
      if (navigator.geolocation) {
        console.log('🌐 Fallback vers API Web...');
        return new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              console.log('🌐 ✅ Position web obtenue:', pos);
              setPosition(pos);
              resolve(pos);
            },
            (webError) => {
              console.error('🌐 ❌ Erreur API web:', webError);
              reject(new Error(`Géolocalisation impossible: ${webError.message}`));
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 300000
            }
          );
        });
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    position,
    loading,
    getCurrentPosition,
    checkPermissions,
    requestPermissions
  };
};