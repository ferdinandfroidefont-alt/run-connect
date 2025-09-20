import { useState, useCallback } from 'react';
import { Position, GeolocationPermissions } from '@/types/permissions';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { MIUIPermissionsFix } from '@/lib/miuiPermissionsFix';

export const useGeolocation = () => {
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);

  // DEBUG: Ajouter logs pour diagnostiquer le problème Play Store
  const debugInfo = () => {
    console.log('🔥 DEBUG GEOLOCATION HOOK:');
    console.log('🔥 - Platform Capacitor:', Capacitor.getPlatform());
    console.log('🔥 - User Agent:', navigator.userAgent);
    console.log('🔥 - Geolocation disponible:', !!navigator.geolocation);
  };

  const checkPermissions = async (): Promise<GeolocationPermissions> => {
    console.log('🔥 checkPermissions - API standard');
    
    try {
      if (Capacitor.getPlatform() !== 'web') {
        const result = await Geolocation.checkPermissions();
        return { 
          location: result.location, 
          coarseLocation: result.coarseLocation || result.location 
        };
      }
    } catch (error) {
      console.log('🔥 Check permissions échoué:', error);
    }
    
    return { location: 'granted', coarseLocation: 'granted' };
  };

  const isPluginAvailable = (): boolean => {
    return !!(window as any).PermissionsPlugin;
  };

  const requestPermissions = async (): Promise<GeolocationPermissions> => {
    console.log('🔥 requestPermissions - essai immédiat...');
    
    try {
      // Essayer le plugin custom s'il est disponible
      if (isPluginAvailable()) {
        console.log('🔥 Utilisation PermissionsPlugin.forceRequestLocationPermissions');
        const result = await (window as any).PermissionsPlugin.forceRequestLocationPermissions();
        console.log('🔥 Résultat PermissionsPlugin:', result);
        
        if (result && result.granted) {
          return { location: 'granted', coarseLocation: 'granted' };
        }
      }
      
      // Fallback immédiat vers l'API standard Capacitor
      if (Capacitor.getPlatform() !== 'web') {
        console.log('🔥 Fallback vers Capacitor standard');
        const result = await Geolocation.requestPermissions();
        return { 
          location: result.location, 
          coarseLocation: result.coarseLocation || result.location 
        };
      }
    } catch (error) {
      console.log('🔥 Request permissions échoué:', error);
    }
    
    return { location: 'granted', coarseLocation: 'granted' };
  };

  const requestPermissionsMIUI = async (): Promise<boolean> => {
    console.log('🔥 requestPermissionsMIUI - spécial Xiaomi/Redmi');
    return await MIUIPermissionsFix.requestLocationWithMIUIFallback();
  };

  const getCurrentPosition = useCallback(async (): Promise<Position | null> => {
    setLoading(true);
    debugInfo();
    
    try {
      console.log('🔥 getCurrentPosition - essai immédiat des permissions');
      
      // Essayer le plugin custom s'il est disponible
      if (isPluginAvailable()) {
        console.log('🔥 Utilisation PermissionsPlugin pour position');
        try {
          const result = await (window as any).PermissionsPlugin.forceRequestLocationPermissions();
          console.log('🔥 Plugin location result:', result);
          
          if (result && result.granted) {
            const position = await Geolocation.getCurrentPosition({
              enableHighAccuracy: true,
              timeout: 15000
            });
            
            const pos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setPosition(pos);
            console.log('🔥 Position via plugin obtenue:', pos);
            return pos;
          }
        } catch (pluginError) {
          console.log('🔥 Plugin échoué, fallback vers Capacitor:', pluginError);
        }
      }
      
      // Fallback immédiat vers Capacitor standard
      if (Capacitor.getPlatform() !== 'web') {
        console.log('🔥 Plateforme mobile détectée - Capacitor standard');
        try {
          const permissions = await Geolocation.requestPermissions();
          console.log('🔥 Permissions Capacitor:', permissions);
          
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
            console.log('🔥 Position Capacitor obtenue:', pos);
            return pos;
          }
        } catch (capacitorError) {
          console.log('🔥 Capacitor échoué, fallback vers web:', capacitorError);
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
    requestPermissions,
    requestPermissionsMIUI
  };
};