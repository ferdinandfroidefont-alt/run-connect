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
      // MODE NATIF pour AAB Play Store - Toujours activer sur mobile
      const isAndroidAAB = navigator.userAgent.includes('wv') || // Android WebView
                          navigator.userAgent.includes('Android') ||
                          Capacitor.getPlatform() === 'android';
      const isIOSNative = Capacitor.getPlatform() === 'ios' ||
                         navigator.userAgent.includes('iPhone') ||
                         navigator.userAgent.includes('iPad');
      const isRealNative = Capacitor.isNativePlatform() || isAndroidAAB || isIOSNative;
      
      console.log('🔍 Détection AAB/Native:', {
        isNativePlatform: Capacitor.isNativePlatform(),
        platform: Capacitor.getPlatform(),
        userAgent: navigator.userAgent,
        isAndroidAAB,
        isIOSNative,
        isRealNative
      });
      
      if (isRealNative) {
        console.log('🎯 SUPER MODE géolocalisation pour anciens téléphones...');
        
        // 1. FORCE native permissions même si pas détecté
        console.log('📱 Mode NATIF forcé - Demande permissions...');
        let permissions = await checkPermissions();
        console.log('🔍 Permissions initiales natives:', permissions);
        
        if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
          console.log('📱 FORCE permissions géolocalisation...');
          
          // Demander 3 fois si nécessaire (certains téléphones buggent)
          for (let i = 0; i < 3; i++) {
            try {
              permissions = await requestPermissions();
              console.log(`🔍 Tentative ${i+1} permissions:`, permissions);
              
              if (permissions.location === 'granted' || permissions.coarseLocation === 'granted') {
                break;
              }
              
              // Délai progressif entre tentatives
              await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            } catch (permError) {
              console.log(`❌ Erreur tentative ${i+1}:`, permError);
            }
          }
        }
        
        // 2. TOUTES les stratégies possibles, des plus permissives aux plus précises
        const strategies = [
          // Ultra-permissive: cache de 2h, pas de précision, timeout très long
          {
            enableHighAccuracy: false,
            timeout: 60000,
            maximumAge: 7200000, // 2h de cache
            name: 'Ultra-permissive (2h cache)'
          },
          // Permissive: cache de 30min
          {
            enableHighAccuracy: false,
            timeout: 45000,
            maximumAge: 1800000, // 30min
            name: 'Permissive (30min cache)'
          },
          // Normale: cache de 10min
          {
            enableHighAccuracy: false,
            timeout: 30000,
            maximumAge: 600000, // 10min
            name: 'Normale (10min cache)'
          },
          // Rapide: cache de 5min
          {
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 300000, // 5min
            name: 'Rapide (5min cache)'
          },
          // Précise mais avec cache
          {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 120000, // 2min
            name: 'Précise avec cache'
          },
          // Très précise
          {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 0,
            name: 'Très précise'
          }
        ];
        
        let coordinates;
        let successStrategy;
        
        for (const [index, strategy] of strategies.entries()) {
          try {
            console.log(`🎯 Stratégie ${index + 1}/6: ${strategy.name}...`);
            coordinates = await Geolocation.getCurrentPosition({
              enableHighAccuracy: strategy.enableHighAccuracy,
              timeout: strategy.timeout,
              maximumAge: strategy.maximumAge
            });
            successStrategy = strategy.name;
            console.log(`✅ SUCCÈS avec ${strategy.name}:`, coordinates.coords.latitude, coordinates.coords.longitude, `(précision: ${coordinates.coords.accuracy}m)`);
            break;
          } catch (strategyError) {
            console.log(`❌ Échec stratégie ${strategy.name}:`, strategyError);
            if (index === strategies.length - 1) {
              throw strategyError; // Dernière stratégie échouée
            }
          }
        }
        
        if (!coordinates) {
          throw new Error('Toutes les stratégies de géolocalisation ont échoué');
        }
        
        const pos = {
          lat: coordinates.coords.latitude,
          lng: coordinates.coords.longitude
        };
        
        setPosition(pos);
        console.log(`🎯 Position FINALE obtenue via ${successStrategy}:`, pos, `Précision: ${coordinates.coords.accuracy}m`);
        return pos;
      } else {
        // WEB: Version ultra-permissive aussi
        console.log('🌐 SUPER MODE Web géolocalisation...');
        
        return new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
          }

          const webStrategies = [
            { enableHighAccuracy: false, timeout: 60000, maximumAge: 7200000, name: 'Web Ultra-permissive' },
            { enableHighAccuracy: false, timeout: 30000, maximumAge: 1800000, name: 'Web Permissive' },
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000, name: 'Web Rapide' },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000, name: 'Web Précise' }
          ];
          
          let attemptIndex = 0;
          
          const tryStrategy = () => {
            const strategy = webStrategies[attemptIndex];
            console.log(`🌐 Tentative Web ${attemptIndex + 1}/4: ${strategy.name}...`);
            
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const pos = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude
                };
                setPosition(pos);
                console.log(`🌐 SUCCÈS ${strategy.name}:`, pos, `Précision: ${position.coords.accuracy}m`);
                resolve(pos);
              },
              (error) => {
                console.log(`❌ Échec ${strategy.name}:`, error);
                attemptIndex++;
                if (attemptIndex < webStrategies.length) {
                  tryStrategy(); // Essayer la stratégie suivante
                } else {
                  console.log('❌ TOUTES les stratégies Web ont échoué');
                  reject(error);
                }
              },
              strategy
            );
          };
          
          tryStrategy();
        });
      }
    } catch (error) {
      console.error('❌ ERREUR FINALE géolocalisation:', error);
      
      // Messages d'erreur plus détaillés pour le debug
      let errorMessage = 'Géolocalisation impossible sur cet appareil';
      if (error && typeof error === 'object' && 'message' in error) {
        const msg = String(error.message).toLowerCase();
        if (msg.includes('denied') || msg.includes('permission')) {
          errorMessage = 'Autorisations de géolocalisation refusées - Activez-les dans Paramètres > Apps > RunConnect > Autorisations';
        } else if (msg.includes('unavailable') || msg.includes('network')) {
          errorMessage = 'Service de géolocalisation indisponible - Vérifiez GPS et réseau';
        } else if (msg.includes('timeout')) {
          errorMessage = 'Délai de géolocalisation dépassé - GPS trop lent';
        }
      }
      
      throw new Error(errorMessage);
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