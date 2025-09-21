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
      console.log('🚀🚀🚀 GÉOLOCALISATION DÉMARRÉE - DEBUG COMPLET');
      console.log('🚀 URL actuelle:', window.location.href);
      console.log('🚀 User Agent:', navigator.userAgent);
      console.log('🚀 Navigator geolocation disponible:', !!navigator.geolocation);
      
      // Vérifier le mode Force Android
      const forceAndroid = !!(window as any).ForceAndroidMode || new URLSearchParams(window.location.search).has('forceAndroid');
      const isNativeDetected = detectNativeAndroid();
      
      console.log('🚀 Force Android:', forceAndroid);
      console.log('🚀 Native détecté:', isNativeDetected);
      console.log('🚀 Capacitor disponible:', !!(window as any).Capacitor);
      
      // DÉTECTION ANDROID 10+ : Forcer Capacitor même si native pas détecté parfaitement
      const androidVersionMatch = navigator.userAgent.match(/Android (\d+)/);
      const androidVersion = androidVersionMatch ? parseInt(androidVersionMatch[1]) : 0;
      const isAndroid10Plus = navigator.userAgent.includes('Android') && androidVersion >= 10;
      
      console.log('🔍 Détection Android 10+:', isAndroid10Plus);
      console.log('🔍 Version Android détectée:', androidVersion);
      console.log('🔍 User Agent:', navigator.userAgent);
      
      // ANDROID 10+ : Forcer Capacitor obligatoirement
      if (isAndroid10Plus || isNativeDetected || forceAndroid) {
        console.log('📱 MODE ANDROID NATIF - Tentative Capacitor...');
        try {
          const permissions = await Geolocation.requestPermissions();
          console.log('📱 Permissions Capacitor:', permissions);
          
          if (permissions.location === 'granted') {
            const position = await Geolocation.getCurrentPosition({
              enableHighAccuracy: true,
              timeout: 15000
            });
            console.log('📱 ✅ Position Capacitor obtenue:', position);
            
            const pos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setPosition(pos);
            return pos;
          } else {
            console.log('📱 ❌ Permissions Capacitor refusées, fallback web');
          }
        } catch (capacitorError) {
          console.log('📱 ❌ Capacitor échoué, fallback web:', capacitorError);
        }
      }
      
      // FALLBACK WEB pour tous les autres cas
      console.log('🌐 MODE WEB DÉTECTÉ - Utilisation directe navigator.geolocation');
      
      if (!navigator.geolocation) {
          throw new Error('Geolocation API not supported in this browser');
        }

        return new Promise((resolve, reject) => {
          console.log('🌐 Demande de position via navigator.geolocation...');
          
          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log('🌐 ✅ SUCCÈS - Position reçue:', {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: position.timestamp
              });
              
              const pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              setPosition(pos);
              resolve(pos);
            },
            (error) => {
              console.error('🌐 ❌ ERREUR géolocalisation web:', {
                code: error.code,
                message: error.message,
                PERMISSION_DENIED: error.code === 1,
                POSITION_UNAVAILABLE: error.code === 2,
                TIMEOUT: error.code === 3
              });
              reject(error);
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 60000
            }
          );
        });
      
    } catch (error) {
      console.error('🚀 ❌ ERREUR GLOBALE géolocalisation:', error);
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