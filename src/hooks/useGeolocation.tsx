import { useState, useCallback } from 'react';
import { Position, GeolocationPermissions } from '@/types/permissions';
import { Geolocation } from '@capacitor/geolocation';
import { detectNativeAndroid } from '@/lib/detectNativeAndroid';

export const useGeolocation = () => {
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);

  const checkPermissions = async (): Promise<GeolocationPermissions> => {
    try {
      if (detectNativeAndroid()) {
        const result = await Geolocation.checkPermissions();
        return { 
          location: result.location, 
          coarseLocation: result.coarseLocation || result.location 
        };
      }
    } catch (error) {
      console.log('Erreur check permissions:', error);
    }
    
    return { location: 'granted', coarseLocation: 'granted' };
  };

  const requestPermissions = async (): Promise<GeolocationPermissions> => {
    try {
      if (detectNativeAndroid()) {
        const result = await Geolocation.requestPermissions();
        return { 
          location: result.location, 
          coarseLocation: result.coarseLocation || result.location 
        };
      }
    } catch (error) {
      console.log('Erreur request permissions:', error);
    }
    
    return { location: 'granted', coarseLocation: 'granted' };
  };

  const getCurrentPosition = useCallback(async (): Promise<Position | null> => {
    setLoading(true);
    
    try {
      // Vérifier le mode Force Android
      const forceAndroid = !!(window as any).ForceAndroidMode || new URLSearchParams(window.location.search).has('forceAndroid');
      const isNativeDetected = detectNativeAndroid();
      
      console.log('📍📍📍 GEOLOCATION - Mode de fonctionnement:');
      console.log('📍 Force Android:', forceAndroid);
      console.log('📍 Native détecté:', isNativeDetected);
      console.log('📍 Capacitor disponible:', !!(window as any).Capacitor);
      
      // Essayer d'abord Capacitor si Android natif détecté OU forcé
      if (isNativeDetected || forceAndroid) {
        try {
          console.log('📍 ✅ Tentative géolocalisation Capacitor (natif ou forcé)...');
          const permissions = await Geolocation.requestPermissions();
          console.log('📍 Permissions géolocalisation:', permissions);
          
          if (permissions.location === 'granted') {
            const position = await Geolocation.getCurrentPosition({
              enableHighAccuracy: true,
              timeout: 15000
            });
            console.log('📍 Position obtenue via Capacitor:', position);
            
            const pos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setPosition(pos);
            console.log('📍 ✅ Position Capacitor traitée avec succès');
            return pos;
          } else {
            console.log('❌ Permissions refusées:', permissions);
          }
        } catch (capacitorError) {
          console.log('❌ Capacitor échoué, fallback vers web:', capacitorError);
        }
      } else {
        console.log('🌐 Web détecté, utilisation directe des APIs web');
      }
      
      // Fallback vers Web API
      console.log('📍 🔄 Fallback vers navigator.geolocation');
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('📍 Position navigateur reçue:', position);
            const pos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setPosition(pos);
            resolve(pos);
          },
          (error) => {
            console.error('📍 ❌ Erreur géolocalisation web:', error);
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
      console.error('📍 ❌ Erreur position:', error);
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