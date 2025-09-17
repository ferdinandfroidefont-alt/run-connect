import { useState, useCallback } from 'react';
import { Position, GeolocationPermissions } from '@/types/permissions';
import { 
  forceGeolocationPermissions, 
  forceGetPosition, 
  isRealAndroidDevice 
} from '@/lib/forceNativePermissions';

export const useGeolocation = () => {
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);

  const checkPermissions = async (): Promise<GeolocationPermissions> => {
    // Sur AAB Android, utiliser notre détection forcée
    if (isRealAndroidDevice()) {
      console.log('🔥 FORCE check permissions sur Android');
      try {
        await forceGeolocationPermissions();
        return { location: 'granted', coarseLocation: 'granted' };
      } catch (error) {
        console.log('🔥 Permissions refusées:', error);
        return { location: 'denied', coarseLocation: 'denied' };
      }
    }
    return { location: 'granted', coarseLocation: 'granted' };
  };

  const requestPermissions = async (): Promise<GeolocationPermissions> => {
    // Sur AAB Android, utiliser notre demande forcée
    if (isRealAndroidDevice()) {
      console.log('🔥 FORCE request permissions sur Android');
      try {
        await forceGeolocationPermissions();
        return { location: 'granted', coarseLocation: 'granted' };
      } catch (error) {
        console.log('🔥 Demande permissions échouée:', error);
        return { location: 'denied', coarseLocation: 'denied' };
      }
    }
    return { location: 'granted', coarseLocation: 'granted' };
  };

  const getCurrentPosition = useCallback(async (): Promise<Position | null> => {
    setLoading(true);
    
    try {
      console.log('🔥 FORCE getCurrentPosition - Android:', isRealAndroidDevice());
      
      // Sur AAB Android, utiliser notre méthode forcée
      if (isRealAndroidDevice()) {
        console.log('🔥 Utilisation FORCE position Android');
        
        const result = await forceGetPosition();
        const pos = { lat: result.lat, lng: result.lng };
        setPosition(pos);
        console.log('🔥 Position FORCÉE obtenue:', pos);
        return pos;
      } else {
        // Web fallback standard
        console.log('🌐 Mode web standard');
        return new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
          }

          navigator.geolocation.getCurrentPosition(
            (position) => {
              const pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              setPosition(pos);
              resolve(pos);
            },
            (error) => {
              reject(error);
            },
            {
              enableHighAccuracy: false,
              timeout: 30000,
              maximumAge: 600000
            }
          );
        });
      }
    } catch (error) {
      console.error('🔥 Erreur FORCE position:', error);
      throw new Error('Géolocalisation impossible - Vérifiez les permissions dans Paramètres > Apps > RunConnect');
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