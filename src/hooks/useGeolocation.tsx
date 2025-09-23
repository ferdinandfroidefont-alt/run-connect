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
    console.log('🌍 DÉBUT GÉOLOCALISATION ROBUSTE...');
    
    try {
      const isNative = await nativeManager.ensureNativeStatus();
      console.log('🌍 Mode détecté:', isNative ? 'NATIF' : 'WEB');
      
      // STRATÉGIE 1: Essayer Capacitor en priorité (même sur web)
      console.log('🔄 Tentative Capacitor...');
      try {
        const permissions = await Geolocation.requestPermissions();
        console.log('📱 Permissions Capacitor:', permissions);
        
        if (permissions.location === 'granted') {
          const result = await Geolocation.getCurrentPosition({
            enableHighAccuracy: false, // Plus rapide
            timeout: 15000,
            maximumAge: 300000
          });
          
          const pos = {
            lat: result.coords.latitude,
            lng: result.coords.longitude
          };
          
          console.log('✅ Position via Capacitor:', pos);
          setPosition(pos);
          return pos;
        }
      } catch (capacitorError) {
        console.log('❌ Capacitor échoué:', capacitorError);
      }

      // STRATÉGIE 2: Fallback Navigator Web
      console.log('🔄 Fallback Navigator Web...');
      if (!navigator.geolocation) {
        throw new Error('Géolocalisation non supportée');
      }
      
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Timeout géolocalisation'));
        }, 12000); // Timeout plus court
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            clearTimeout(timeoutId);
            const pos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            console.log('✅ Position via Navigator:', pos);
            setPosition(pos);
            resolve(pos);
          },
          (error) => {
            clearTimeout(timeoutId);
            console.error('❌ Navigator échoué:', error);
            
            let errorMessage = 'Géolocalisation échouée';
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = 'Permission refusée - Activez la géolocalisation';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = 'Position indisponible';
                break;
              case error.TIMEOUT:
                errorMessage = 'Délai dépassé';
                break;
            }
            
            reject(new Error(errorMessage));
          },
          {
            enableHighAccuracy: false, // Plus rapide et plus compatible
            timeout: 10000,
            maximumAge: 600000 // Cache plus long
          }
        );
      });
      
    } catch (error) {
      console.error('🌍❌ GÉOLOCALISATION FINALE ÉCHOUÉE:', error);
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