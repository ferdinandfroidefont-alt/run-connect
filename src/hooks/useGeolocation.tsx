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
      console.log('🚀 GÉOLOCALISATION DÉMARRÉE - Mode simplifié');
      
      // Vérifier le mode Force Android
      const forceAndroid = !!(window as any).ForceAndroidMode || new URLSearchParams(window.location.search).has('forceAndroid');
      const isNativeDetected = detectNativeAndroid();
      
      console.log('🚀 Force Android:', forceAndroid);
      console.log('🚀 Native détecté:', isNativeDetected);
      
      // Si Android natif détecté OU mode forcé : utiliser Capacitor
      if (isNativeDetected || forceAndroid) {
        console.log('📱 MODE ANDROID NATIF - Utilisation Capacitor');
        try {
          const permissions = await Geolocation.requestPermissions();
          console.log('📱 Permissions:', permissions);
          
          if (permissions.location === 'granted') {
            const position = await Geolocation.getCurrentPosition({
              enableHighAccuracy: true,
              timeout: 15000
            });
            console.log('📱 ✅ Position Capacitor:', position);
            
            const pos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setPosition(pos);
            return pos;
          }
        } catch (capacitorError) {
          console.log('📱 ❌ Capacitor échoué, fallback web:', capacitorError);
        }
      }
      
      // FALLBACK : Utiliser l'API Web standard
      console.log('🌐 MODE WEB - navigator.geolocation');
      
      if (!navigator.geolocation) {
        throw new Error('Geolocation not supported');
      }

      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('🌐 ✅ Position web reçue:', position);
            const pos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setPosition(pos);
            resolve(pos);
          },
          (error) => {
            console.error('🌐 ❌ Erreur web:', error);
            reject(error);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 60000
          }
        );
      });
      
    } catch (error) {
      console.error('🚀 ❌ ERREUR GLOBALE:', error);
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