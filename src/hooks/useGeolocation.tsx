import { useState, useCallback } from 'react';
import { Geolocation, PermissionStatus } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { Position, GeolocationPermissions } from '@/types/permissions';

export const useGeolocation = () => {
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);

  const checkPermissions = async (): Promise<GeolocationPermissions> => {
    if (Capacitor.isNativePlatform()) {
      try {
        const permissions = await Geolocation.checkPermissions();
        console.log('🔍 Geolocation permissions:', permissions);
        return permissions;
      } catch (error) {
        console.error('❌ Error checking geolocation permissions:', error);
        return { location: 'denied', coarseLocation: 'denied' };
      }
    }
    return { location: 'granted', coarseLocation: 'granted' };
  };

  const requestPermissions = async (): Promise<GeolocationPermissions> => {
    if (Capacitor.isNativePlatform()) {
      try {
        const permissions = await Geolocation.requestPermissions();
        console.log('🔍 Requested geolocation permissions:', permissions);
        return permissions;
      } catch (error) {
        console.error('❌ Error requesting geolocation permissions:', error);
        return { location: 'denied', coarseLocation: 'denied' };
      }
    }
    return { location: 'granted', coarseLocation: 'granted' };
  };

  const getCurrentPosition = useCallback(async (): Promise<Position | null> => {
    setLoading(true);
    
    try {
      if (Capacitor.isNativePlatform()) {
        // Check and request permissions first
        let permissions = await checkPermissions();
        if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
          permissions = await requestPermissions();
          if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
            throw new Error('Permission géolocalisation refusée');
          }
        }

        // Use Capacitor Geolocation on native platforms
        const coordinates = await Geolocation.getCurrentPosition({
          enableHighAccuracy: false, // Plus compatible sur tous les appareils
          timeout: 15000, // Timeout plus long
          maximumAge: 300000 // Cache de 5 minutes
        });
        
        const pos = {
          lat: coordinates.coords.latitude,
          lng: coordinates.coords.longitude
        };
        
        setPosition(pos);
        console.log('🎯 Position obtenue via Capacitor:', pos);
        return pos;
      } else {
        // Fallback to web API for browsers
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
              console.log("Geolocation error:", error);
              reject(error);
            },
            {
              enableHighAccuracy: false,
              timeout: 15000, // Timeout plus long pour les appareils lents
              maximumAge: 300000
            }
          );
        });
      }
    } catch (error) {
      console.error('Geolocation error:', error);
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