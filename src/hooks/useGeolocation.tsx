import { useState, useCallback } from 'react';
import { Position, GeolocationPermissions } from '@/types/permissions';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export const useGeolocation = () => {
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);

  const checkPermissions = async (): Promise<GeolocationPermissions> => {
    try {
      if (Capacitor.getPlatform() !== 'web') {
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
      if (Capacitor.getPlatform() !== 'web') {
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
      // Essayer d'abord Capacitor standard si on est sur mobile
      if (Capacitor.getPlatform() !== 'web') {
        try {
          const permissions = await Geolocation.requestPermissions();
          
          if (permissions.location === 'granted') {
            const position = await Geolocation.getCurrentPosition({
              enableHighAccuracy: true,
              timeout: 15000
            });
            
            const pos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setPosition(pos);
            return pos;
          }
        } catch (capacitorError) {
          console.log('Capacitor échoué, fallback vers web:', capacitorError);
        }
      }
      
      // Fallback vers Web API
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
            console.error('Erreur géolocalisation web:', error);
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
      console.error('Erreur position:', error);
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