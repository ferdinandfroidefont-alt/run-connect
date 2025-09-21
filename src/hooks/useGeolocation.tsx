import { useState, useCallback } from 'react';
import { Position, GeolocationPermissions } from '@/types/permissions';
import { Geolocation } from '@capacitor/geolocation';
import { nativeManager } from '@/lib/nativeInit';

export const useGeolocation = () => {
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);

  const checkPermissions = async (): Promise<GeolocationPermissions> => {
    try {
      const isNative = await nativeManager.ensureNativeStatus();
      
      if (isNative) {
        const result = await Geolocation.checkPermissions();
        return { 
          location: result.location, 
          coarseLocation: result.coarseLocation || result.location 
        };
      } else {
        // Mode web - pas de check permissions spécifique
        return { location: 'prompt', coarseLocation: 'prompt' };
      }
    } catch (error) {
      console.log('❌ Erreur check permissions géolocalisation:', error);
      return { location: 'prompt', coarseLocation: 'prompt' };
    }
  };

  const requestPermissions = async (): Promise<GeolocationPermissions> => {
    try {
      const isNative = await nativeManager.ensureNativeStatus();
      
      if (isNative) {
        const result = await Geolocation.requestPermissions();
        return { 
          location: result.location, 
          coarseLocation: result.coarseLocation || result.location 
        };
      } else {
        // Mode web - simuler granted si geolocation disponible
        if (navigator.geolocation) {
          return { location: 'granted', coarseLocation: 'granted' };
        } else {
          return { location: 'denied', coarseLocation: 'denied' };
        }
      }
    } catch (error) {
      console.log('❌ Erreur request permissions géolocalisation:', error);
      return { location: 'denied', coarseLocation: 'denied' };
    }
  };

  const getCurrentPosition = useCallback(async (): Promise<Position | null> => {
    setLoading(true);
    console.log('🌍 DÉBUT GÉOLOCALISATION...');
    
    try {
      // Attendre confirmation du statut natif
      const isNative = await nativeManager.ensureNativeStatus();
      console.log('🌍 Mode confirmé:', isNative ? 'NATIF' : 'WEB');
      
      if (isNative) {
        // ===== MODE NATIF - CAPACITOR =====
        console.log('📱 Utilisation Capacitor Geolocation');
        
        try {
          // Demander permissions d'abord
          const permissions = await Geolocation.requestPermissions();
          console.log('📱 Permissions obtenues:', permissions);
          
          if (permissions.location !== 'granted') {
            throw new Error('Permission géolocalisation refusée');
          }
          
          // Obtenir position avec timeout étendu pour mobile
          const result = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 20000, // 20s pour mobile
            maximumAge: 300000 // 5min cache
          });
          
          const pos = {
            lat: result.coords.latitude,
            lng: result.coords.longitude
          };
          
          console.log('📱✅ Position Capacitor obtenue:', pos);
          setPosition(pos);
          return pos;
          
        } catch (capacitorError) {
          console.error('📱❌ Erreur Capacitor:', capacitorError);
          throw capacitorError;
        }
        
      } else {
        // ===== MODE WEB - NAVIGATOR =====
        console.log('🌐 Utilisation navigator.geolocation');
        
        if (!navigator.geolocation) {
          throw new Error('Géolocalisation non supportée par ce navigateur');
        }
        
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('Timeout géolocalisation (15s)'));
          }, 15000);
          
          navigator.geolocation.getCurrentPosition(
            (position) => {
              clearTimeout(timeoutId);
              const pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              console.log('🌐✅ Position Web obtenue:', pos);
              setPosition(pos);
              resolve(pos);
            },
            (error) => {
              clearTimeout(timeoutId);
              console.error('🌐❌ Erreur Web:', error);
              
              let errorMessage = 'Erreur de géolocalisation';
              switch (error.code) {
                case error.PERMISSION_DENIED:
                  errorMessage = 'Permission géolocalisation refusée';
                  break;
                case error.POSITION_UNAVAILABLE:
                  errorMessage = 'Position non disponible';
                  break;
                case error.TIMEOUT:
                  errorMessage = 'Délai dépassé';
                  break;
              }
              
              reject(new Error(errorMessage));
            },
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 300000
            }
          );
        });
      }
      
    } catch (error) {
      console.error('🌍❌ ERREUR GÉOLOCALISATION FINALE:', error);
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