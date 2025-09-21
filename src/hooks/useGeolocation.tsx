import { useState, useCallback } from 'react';
import { Position, GeolocationPermissions } from '@/types/permissions';
import { Geolocation } from '@capacitor/geolocation';

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
    console.log('🚀 DÉBUT GÉOLOCALISATION');
    
    try {
      // MÉTHODE 1: Essayer Capacitor d'abord
      console.log('📱 Tentative Capacitor...');
      
      const permissions = await Geolocation.requestPermissions();
      console.log('📱 Permissions Capacitor:', permissions);
      
      if (permissions.location === 'granted') {
        const result = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 300000
        });
        
        console.log('📱 ✅ Position Capacitor:', result);
        
        const pos = {
          lat: result.coords.latitude,
          lng: result.coords.longitude
        };
        
        setPosition(pos);
        return pos;
      } else {
        console.log('📱 ❌ Permission Capacitor refusée:', permissions.location);
      }
      
    } catch (capacitorError) {
      console.log('📱 ❌ Capacitor échoué:', capacitorError);
    }
    
    try {
      // MÉTHODE 2: Fallback API Web natif
      console.log('🌐 Tentative API Web...');
      
      if (!navigator.geolocation) {
        throw new Error('Géolocalisation non supportée par ce navigateur');
      }

      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const pos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            console.log('🌐 ✅ Position Web:', pos);
            setPosition(pos);
            resolve(pos);
          },
          (error) => {
            console.error('🌐 ❌ Erreur API Web:', error);
            let errorMessage = 'Erreur de géolocalisation';
            
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = 'Permission géolocalisation refusée. Activez-la dans les paramètres.';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = 'Position non disponible. Vérifiez le GPS.';
                break;
              case error.TIMEOUT:
                errorMessage = 'Délai dépassé. Réessayez.';
                break;
            }
            
            reject(new Error(errorMessage));
          },
          {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 300000
          }
        );
      });
      
    } catch (error) {
      console.error('🚀 ❌ ERREUR FINALE:', error);
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