import { useState, useCallback } from 'react';
import { Position, GeolocationPermissions } from '@/types/permissions';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export const useGeolocation = () => {
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);

  // Détection native simplifiée directe
  const isNative = () => {
    const native = Capacitor.isNativePlatform() || 
           window.location.protocol === 'capacitor:' ||
           (navigator.userAgent.includes('Android') && navigator.userAgent.includes('wv'));
    
    console.log('🔍 DÉTECTION PLATEFORME:', {
      'Capacitor.isNativePlatform()': Capacitor.isNativePlatform(),
      'window.location.protocol': window.location.protocol,
      'navigator.userAgent': navigator.userAgent,
      'URL actuelle': window.location.href,
      'Résultat isNative': native
    });
    
    return native;
  };

  const checkPermissions = async (): Promise<GeolocationPermissions> => {
    try {
      if (isNative()) {
        console.log('📱 Check permissions Capacitor');
        const result = await Geolocation.checkPermissions();
        return { 
          location: result.location, 
          coarseLocation: result.coarseLocation || result.location 
        };
      } else {
        console.log('🌐 Check permissions web');
        return { location: 'prompt', coarseLocation: 'prompt' };
      }
    } catch (error) {
      console.log('❌ Erreur check permissions:', error);
      return { location: 'prompt', coarseLocation: 'prompt' };
    }
  };

  const requestPermissions = async (): Promise<GeolocationPermissions> => {
    try {
      if (isNative()) {
        console.log('📱 Request permissions Capacitor');
        const result = await Geolocation.requestPermissions();
        console.log('📱 Résultat permissions:', result);
        return { 
          location: result.location, 
          coarseLocation: result.coarseLocation || result.location 
        };
      } else {
        console.log('🌐 Request permissions web');
        if (navigator.geolocation) {
          return { location: 'granted', coarseLocation: 'granted' };
        } else {
          return { location: 'denied', coarseLocation: 'denied' };
        }
      }
    } catch (error) {
      console.log('❌ Erreur request permissions:', error);
      return { location: 'denied', coarseLocation: 'denied' };
    }
  };

  const getCurrentPosition = useCallback(async (): Promise<Position | null> => {
    setLoading(true);
    console.log('🌍 GÉOLOCALISATION - Début');
    
    try {
      const nativeMode = isNative();
      console.log('🌍 Mode:', nativeMode ? 'NATIF' : 'WEB');
      
      if (nativeMode) {
        console.log('📱 Tentative Capacitor natif...');
        
        // Force la demande de permission d'abord
        const permissions = await Geolocation.requestPermissions();
        console.log('📱 Permissions:', permissions);
        
        if (permissions.location !== 'granted') {
          throw new Error(`Permission géolocalisation refusée: ${permissions.location}`);
        }
        
        // Plusieurs tentatives avec configurations différentes
        const configs = [
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 }
        ];
        
        for (const config of configs) {
          try {
            console.log('📱 Tentative avec config:', config);
            const result = await Geolocation.getCurrentPosition(config);
            
            const pos = {
              lat: result.coords.latitude,
              lng: result.coords.longitude
            };
            
            console.log('✅ Position Capacitor:', pos);
            setPosition(pos);
            return pos;
            
          } catch (configError) {
            console.log('❌ Config échouée:', configError);
            // Continue à la config suivante
          }
        }
        
        throw new Error('Toutes les configurations Capacitor ont échoué');
      }
      
      // Fallback Web
      console.log('🌐 Fallback Navigator Web');
      
      if (!navigator.geolocation) {
        throw new Error('Géolocalisation non supportée par ce navigateur');
      }
      
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Timeout géolocalisation web'));
        }, 10000);
        
        navigator.geolocation.getCurrentPosition(
          (geoPosition) => {
            clearTimeout(timeoutId);
            const pos = {
              lat: geoPosition.coords.latitude,
              lng: geoPosition.coords.longitude
            };
            console.log('✅ Position Web:', pos);
            setPosition(pos);
            resolve(pos);
          },
          (error) => {
            clearTimeout(timeoutId);
            console.error('❌ Erreur Web:', error);
            
            let message = 'Erreur géolocalisation';
            switch (error.code) {
              case error.PERMISSION_DENIED:
                message = 'Permission géolocalisation refusée';
                break;
              case error.POSITION_UNAVAILABLE:
                message = 'Position indisponible';
                break;
              case error.TIMEOUT:
                message = 'Délai de géolocalisation dépassé';
                break;
            }
            reject(new Error(message));
          },
          {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 300000
          }
        );
      });
      
    } catch (error) {
      console.error('🌍❌ ERREUR GÉOLOCALISATION:', error);
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