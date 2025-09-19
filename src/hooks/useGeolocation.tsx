import { useState, useCallback } from 'react';
import { Position, GeolocationPermissions } from '@/types/permissions';
import { 
  forceGeolocationPermissions, 
  forceGetPosition, 
  isRealAndroidDevice 
} from '@/lib/forceNativePermissions';
import { androidPermissions } from '@/lib/androidPermissions';

export const useGeolocation = () => {
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);

  // DEBUG: Ajouter logs pour diagnostiquer le problème Play Store
  const debugInfo = () => {
    console.log('🔥 DEBUG GEOLOCATION HOOK:');
    console.log('🔥 - Platform Capacitor:', (window as any).Capacitor?.getPlatform());
    console.log('🔥 - User Agent:', navigator.userAgent);
    console.log('🔥 - isRealAndroidDevice():', isRealAndroidDevice());
    console.log('🔥 - androidPermissions.isAndroid():', androidPermissions.isAndroid());
    console.log('🔥 - PermissionsPlugin disponible:', !!window.PermissionsPlugin);
  };

  const checkPermissions = async (): Promise<GeolocationPermissions> => {
    debugInfo();
    console.log('🔥 checkPermissions appelé');
    
    // Sur AAB Android, utiliser notre détection forcée
    if (androidPermissions.isAndroid()) {
      console.log('🔥 FORCE check permissions sur Android');
      try {
        await forceGeolocationPermissions();
        return { location: 'granted', coarseLocation: 'granted' };
      } catch (error) {
        console.log('🔥 Permissions refusées:', error);
        return { location: 'denied', coarseLocation: 'denied' };
      }
    }
    console.log('🔥 Mode web - permissions automatiques');
    return { location: 'granted', coarseLocation: 'granted' };
  };

  const requestPermissions = async (): Promise<GeolocationPermissions> => {
    debugInfo();
    console.log('🔥 requestPermissions appelé');
    
    // Sur AAB Android, utiliser notre demande forcée
    if (androidPermissions.isAndroid()) {
      console.log('🔥 FORCE request permissions sur Android');
      try {
        await forceGeolocationPermissions();
        return { location: 'granted', coarseLocation: 'granted' };
      } catch (error) {
        console.log('🔥 Demande permissions échouée:', error);
        return { location: 'denied', coarseLocation: 'denied' };
      }
    }
    console.log('🔥 Mode web - permissions automatiques');
    return { location: 'granted', coarseLocation: 'granted' };
  };

  const getCurrentPosition = useCallback(async (): Promise<Position | null> => {
    setLoading(true);
    debugInfo();
    
    try {
      console.log('🔥 getCurrentPosition appelé - Mode Android natif prioritaire');
      
      // Sur Android, TOUJOURS demander les permissions natives AVANT d'utiliser la géolocalisation
      if (androidPermissions.isAndroid()) {
        console.log('🔥 Android détecté - demande permissions natives');
        
        try {
          // Demander les permissions natives Android FIRST
          const granted = await androidPermissions.forceRequestLocationPermissions();
          if (!granted) {
            throw new Error('Permissions géolocalisation refusées par l\'utilisateur');
          }
          
          // Utiliser l'API Capacitor native après permissions accordées
          console.log('🔥 Permissions accordées, utilisation API Capacitor native');
          const result = await forceGetPosition() as any;
          const pos = {
            lat: result.lat,
            lng: result.lng
          };
          setPosition(pos);
          return pos;
          
        } catch (androidError) {
          console.error('🔥 Erreur Android native:', androidError);
          // Fallback vers web API seulement si les permissions natives échouent
          console.log('🔥 Fallback vers Web API...');
        }
      }
      
      // Mode web ou fallback
      console.log('🌐 Utilisation Web API');
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
            console.log('🌐 Position WEB obtenue:', pos);
            resolve(pos);
          },
          (error) => {
            console.error('🌐 Erreur géolocalisation web:', error);
            reject(error);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 300000
          }
        );
      });
    } catch (error) {
      console.error('🔥 Erreur position:', error);
      return null;
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