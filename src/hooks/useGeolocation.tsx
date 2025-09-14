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
        // Vérification et demande de permissions multiples fois si nécessaire
        let permissions = await checkPermissions();
        console.log('🔍 Permissions initiales:', permissions);
        
        // Si aucune permission n'est accordée, on demande
        if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
          console.log('📱 Demande de permissions...');
          permissions = await requestPermissions();
          console.log('🔍 Permissions après demande:', permissions);
          
          // Attendre un peu et re-vérifier
          await new Promise(resolve => setTimeout(resolve, 1000));
          permissions = await checkPermissions();
          console.log('🔍 Permissions re-vérifiées:', permissions);
          
          if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
            throw new Error('Permission géolocalisation refusée. Veuillez activer la géolocalisation dans les paramètres de l\'app.');
          }
        }

        // Essayer d'abord avec haute précision, puis fallback
        let coordinates;
        try {
          console.log('🎯 Tentative géolocalisation haute précision...');
          coordinates = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          });
        } catch (highAccuracyError) {
          console.log('⚠️ Haute précision échouée, tentative précision normale...', highAccuracyError);
          coordinates = await Geolocation.getCurrentPosition({
            enableHighAccuracy: false,
            timeout: 20000,
            maximumAge: 300000
          });
        }
        
        const pos = {
          lat: coordinates.coords.latitude,
          lng: coordinates.coords.longitude
        };
        
        setPosition(pos);
        console.log('🎯 Position obtenue via Capacitor:', pos, 'Précision:', coordinates.coords.accuracy + 'm');
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
              console.log('🌐 Position obtenue via Web API:', pos);
              resolve(pos);
            },
            (error) => {
              console.log("🌐 Erreur géolocalisation Web:", error);
              // Tentative avec paramètres plus permissifs
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                  };
                  setPosition(pos);
                  resolve(pos);
                },
                (fallbackError) => {
                  console.log("🌐 Erreur géolocalisation fallback:", fallbackError);
                  reject(fallbackError);
                },
                {
                  enableHighAccuracy: false,
                  timeout: 30000,
                  maximumAge: 600000
                }
              );
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 60000
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