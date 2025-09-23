import { useState, useCallback } from 'react';
import { Position, GeolocationPermissions } from '@/types/permissions';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export const useGeolocation = () => {
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);

  // Détection native robuste avec flags AAB
  const isNative = () => {
    // 1. Vérifier d'abord les flags injectés par MainActivity
    const forceNative = (window as any).CapacitorForceNative;
    const isAAB = (window as any).isAABBuild;
    const androidPerms = (window as any).androidPermissions;
    
    // 2. Détection standard Capacitor
    const capacitorNative = Capacitor.isNativePlatform();
    const capacitorProtocol = window.location.protocol === 'capacitor:';
    
    // 3. Détection Android WebView
    const isAndroidWebView = navigator.userAgent.includes('Android') && navigator.userAgent.includes('wv');
    
    // 4. Logique finale : priorité aux flags injectés
    const native = forceNative || isAAB || capacitorNative || capacitorProtocol || isAndroidWebView;
    
    console.log('🔍 DÉTECTION PLATEFORME AVANCÉE:', {
      'window.CapacitorForceNative': forceNative,
      'window.isAABBuild': isAAB,
      'window.androidPermissions': androidPerms,
      'Capacitor.isNativePlatform()': capacitorNative,
      'window.location.protocol': window.location.protocol,
      'navigator.userAgent (Android)': navigator.userAgent.includes('Android'),
      'navigator.userAgent (wv)': navigator.userAgent.includes('wv'),
      'URL actuelle': window.location.href,
      '🎯 RÉSULTAT FINAL': native
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
    
    // Attendre que MainActivity injecte les flags (pour AAB)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const nativeMode = isNative();
      const androidPerms = (window as any).androidPermissions;
      const isAAB = (window as any).isAABBuild;
      
      console.log('🌍 Mode:', nativeMode ? 'NATIF' : 'WEB');
      console.log('🌍 Permissions Android injectées:', androidPerms);
      console.log('🌍 Est AAB:', isAAB);
      
      if (nativeMode) {
        console.log('📱 Tentative Capacitor natif...');
        
        try {
          // Vérifier les permissions Android injectées d'abord
          if (androidPerms && !androidPerms.location) {
            console.log('🚫 Permissions Android manquantes, fallback direct');
            throw new Error('Permissions Android non accordées');
          }
          
          // Force la demande de permission Capacitor
          const permissions = await Geolocation.requestPermissions();
          console.log('📱 Permissions Capacitor:', permissions);
          
          if (permissions.location !== 'granted') {
            console.log('🚫 Permission Capacitor refusée, essai fallback');
            throw new Error(`Permission Capacitor refusée: ${permissions.location}`);
          }
          
          // Tentative Capacitor avec timeout court
          const result = await Promise.race([
            Geolocation.getCurrentPosition({
              enableHighAccuracy: true,
              timeout: 8000,
              maximumAge: 60000
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout Capacitor')), 8000)
            )
          ]);
          
          const pos = {
            lat: (result as any).coords.latitude,
            lng: (result as any).coords.longitude
          };
          
          console.log('✅ Position Capacitor réussie:', pos);
          setPosition(pos);
          return pos;
          
        } catch (capacitorError) {
          console.log('❌ Capacitor échoué:', capacitorError);
          console.log('🔄 Essai fallback Navigator dans AAB...');
          
          // Fallback Navigator même en mode natif (pour AAB défaillant)
          if (!navigator.geolocation) {
            throw new Error('Navigator.geolocation indisponible');
          }
          
          return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              reject(new Error('Timeout Navigator fallback'));
            }, 10000);
            
            navigator.geolocation.getCurrentPosition(
              (geoPosition) => {
                clearTimeout(timeoutId);
                const pos = {
                  lat: geoPosition.coords.latitude,
                  lng: geoPosition.coords.longitude
                };
                console.log('✅ Position Navigator fallback:', pos);
                setPosition(pos);
                resolve(pos);
              },
              (navError) => {
                clearTimeout(timeoutId);
                console.error('❌ Navigator fallback échoué:', navError);
                reject(navError);
              },
              {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 300000
              }
            );
          });
        }
      }
      
      // Mode Web standard
      console.log('🌐 Mode Web standard');
      
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
      console.error('🌍❌ ERREUR GÉOLOCALISATION FINALE:', error);
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