import { useState, useCallback } from 'react';
import { Position, GeolocationPermissions } from '@/types/permissions';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { isReallyNative } from '@/lib/nativeDetection';

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
    console.log('🚀 Géolocalisation...');
    
    const isNative = isReallyNative();
    console.log('🚀 Mode natif détecté:', isNative);
    
    try {
      if (isNative) {
        // Mode natif - utiliser Capacitor
        console.log('📱 Mode natif - utilisation Capacitor');
        
        const permissions = await Geolocation.requestPermissions();
        console.log('📱 Permissions:', permissions);
        
        if (permissions.location === 'granted') {
          const result = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 300000
          });
          
          const pos = {
            lat: result.coords.latitude,
            lng: result.coords.longitude
          };
          
          console.log('📱 ✅ Position Capacitor:', pos);
          setPosition(pos);
          return pos;
        } else {
          throw new Error('Permission géolocalisation refusée');
        }
      } else {
        // Mode web - utiliser navigator.geolocation
        console.log('🌐 Mode web - utilisation navigator.geolocation');
        
        if (!navigator.geolocation) {
          throw new Error('Géolocalisation non supportée');
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
              console.error('🌐 ❌ Erreur:', error);
              reject(new Error('Erreur géolocalisation: ' + error.message));
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
      console.error('🚀 ❌ Erreur géolocalisation:', error);
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