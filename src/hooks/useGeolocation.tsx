import { useState, useCallback } from 'react';
import { Position, GeolocationPermissions } from '@/types/permissions';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export const useGeolocation = () => {
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);

  // Détection du fabricant et de la version Android
  const getDeviceInfo = useCallback(() => {
    const userAgent = navigator.userAgent;
    const androidInfo = (window as any).androidDeviceInfo;
    
    // Utiliser les infos injectées par MainActivity si disponibles
    if (androidInfo) {
      console.log('🔍 Device info depuis MainActivity:', androidInfo);
      return {
        manufacturer: androidInfo.manufacturer,
        model: androidInfo.model,
        androidVersion: androidInfo.androidVersion,
        sdkVersion: androidInfo.sdkVersion
      };
    }
    
    // Fallback sur détection UserAgent
    const androidVersion = userAgent.match(/Android (\d+(?:\.\d+)?)/)?.[1] || 'unknown';
    const manufacturer = userAgent.includes('Samsung') ? 'Samsung' :
                        userAgent.includes('Xiaomi') ? 'Xiaomi' :
                        userAgent.includes('Huawei') ? 'Huawei' :
                        userAgent.includes('OnePlus') ? 'OnePlus' :
                        userAgent.includes('Oppo') ? 'Oppo' :
                        userAgent.includes('Vivo') ? 'Vivo' :
                        'Unknown';
    
    const deviceInfo = { manufacturer, androidVersion, userAgent };
    console.log('🔍 Device info détecté:', deviceInfo);
    return deviceInfo;
  }, []);

  // Détection native robuste avec flags AAB
  const isNative = useCallback(() => {
    // 1. Vérifier d'abord les flags injectés par MainActivity
    const forceNative = (window as any).CapacitorForceNative;
    const isAAB = (window as any).isAABBuild;
    const androidPerms = (window as any).androidPermissions;
    const injectionComplete = (window as any).androidInjectionComplete;
    
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
      'window.androidInjectionComplete': injectionComplete,
      'Capacitor.isNativePlatform()': capacitorNative,
      'window.location.protocol': window.location.protocol,
      'navigator.userAgent (Android)': navigator.userAgent.includes('Android'),
      'navigator.userAgent (wv)': navigator.userAgent.includes('wv'),
      'URL actuelle': window.location.href,
      '🎯 RÉSULTAT FINAL': native
    });
    
    return native;
  }, []);

  const checkPermissions = async (): Promise<GeolocationPermissions> => {
    console.log('🚀 useGeolocation: Vérification des permissions...');
    const deviceInfo = getDeviceInfo();
    
    try {
      if (isNative()) {
        // Vérifier d'abord les permissions Android injectées
        const androidPerms = (window as any).androidPermissions;
        if (androidPerms) {
          console.log('🚀 useGeolocation: Permissions Android injectées:', androidPerms, 'Device:', deviceInfo);
          
          // Si les permissions sont refusées définitivement, le signaler
          if (androidPerms.location === 'denied' && androidPerms.locationPermanentlyDenied) {
            console.warn('⚠️ useGeolocation: Permissions de localisation refusées définitivement');
            return { location: 'denied', coarseLocation: 'denied' };
          }
          
          // Convertir le format Android vers Capacitor
          const locationStatus = androidPerms.location === 'granted' ? 'granted' : 
                                androidPerms.location === 'denied' ? 'denied' : 'prompt';
          return { location: locationStatus, coarseLocation: locationStatus };
        }

        console.log('📱 Check permissions Capacitor');
        const result = await Geolocation.checkPermissions();
        console.log('📱 Résultat permissions Capacitor:', result, 'Device:', deviceInfo);
        return { 
          location: result.location, 
          coarseLocation: result.coarseLocation || result.location 
        };
      } else {
        console.log('🌐 Check permissions web');
        
        // Pour le web, vérifier les permissions du navigateur si possible
        if ('permissions' in navigator) {
          try {
            const result = await navigator.permissions.query({name: 'geolocation'});
            console.log('🌐 Permissions navigateur:', result.state);
            return { location: result.state, coarseLocation: result.state };
          } catch (error) {
            console.warn('⚠️ Impossible de vérifier les permissions navigateur:', error);
          }
        }
        
        return { location: 'prompt', coarseLocation: 'prompt' };
      }
    } catch (error) {
      console.log('❌ Erreur check permissions:', error, 'Device:', deviceInfo);
      return { location: 'prompt', coarseLocation: 'prompt' };
    }
  };

  const requestPermissions = async (): Promise<GeolocationPermissions> => {
    console.log('🚀 useGeolocation: Demande de permissions...');
    const deviceInfo = getDeviceInfo();
    
    try {
      if (isNative()) {
        console.log('📱 Request permissions Capacitor');
        const result = await Geolocation.requestPermissions();
        console.log('📱 Résultat demande permissions:', result, 'Device:', deviceInfo);
        
        // Si les permissions sont refusées, proposer d'ouvrir les paramètres sur certains fabricants
        if (result.location === 'denied' && (deviceInfo.manufacturer === 'Xiaomi' || deviceInfo.manufacturer === 'Huawei' || deviceInfo.manufacturer === 'Oppo')) {
          console.warn('⚠️ useGeolocation: Permissions refusées sur', deviceInfo.manufacturer, '- Redirection vers paramètres recommandée');
        }
        
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
      console.log('❌ Erreur request permissions:', error, 'Device:', deviceInfo);
      return { location: 'denied', coarseLocation: 'denied' };
    }
  };

  const getCurrentPosition = useCallback(async (retryCount = 0): Promise<Position | null> => {
    console.log('🚀 useGeolocation: Début getCurrentPosition, native:', isNative(), 'retry:', retryCount);
    const deviceInfo = getDeviceInfo();
    const maxRetries = 2;
    
    setLoading(true);

    try {
      // Attendre plus longtemps que les flags soient injectés par MainActivity (AAB fix)
      const waitTime = retryCount === 0 ? 1000 : 500; // Plus de temps au premier essai
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      const nativeMode = isNative();
      const androidPerms = (window as any).androidPermissions;
      const isAAB = (window as any).isAABBuild;
      const injectionComplete = (window as any).androidInjectionComplete;
      
      console.log('🌍 GÉOLOCALISATION - Début tentative', retryCount + 1);
      console.log('🌍 Mode:', nativeMode ? 'NATIF' : 'WEB');
      console.log('🌍 Permissions Android injectées:', androidPerms);
      console.log('🌍 Est AAB:', isAAB);
      console.log('🌍 Injection complète:', injectionComplete);
      console.log('🌍 Device:', deviceInfo);
      
      if (nativeMode) {
        console.log('📱 Tentative Capacitor natif...');
        
        try {
          // Vérifier les permissions Android injectées d'abord
          if (androidPerms) {
            if (androidPerms.location === 'denied') {
              if (androidPerms.locationPermanentlyDenied) {
                console.warn('⚠️ useGeolocation: Permissions Android refusées définitivement');
                throw new Error('Permissions permanently denied - redirect to settings needed');
              } else {
                console.warn('⚠️ useGeolocation: Permissions Android refusées, fallback vers navigator');
                throw new Error('Android permissions denied, fallback to navigator');
              }
            }
          }
          
          const startTime = Date.now();
          const permissions = await Geolocation.requestPermissions();
          console.log('📱 Permissions Capacitor obtenues en', Date.now() - startTime, 'ms:', permissions);
          
          if (permissions.location !== 'granted') {
            console.log('🚫 Permission Capacitor refusée, essai fallback');
            throw new Error(`Permission Capacitor refusée: ${permissions.location}`);
          }
          
          // Tentative Capacitor avec timeout augmenté
          const capacitorStartTime = Date.now();
          const result = await Promise.race([
            Geolocation.getCurrentPosition({
              enableHighAccuracy: deviceInfo.manufacturer !== 'Samsung', // Samsung parfois problématique
              timeout: 15000, // Augmenté à 15s
              maximumAge: 300000
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout Capacitor')), 15000)
            )
          ]);
          
          const pos = {
            lat: (result as any).coords.latitude,
            lng: (result as any).coords.longitude
          };
          
          console.log('✅ Position Capacitor obtenue en', Date.now() - capacitorStartTime, 'ms:', pos);
          setPosition(pos);
          return pos;
          
        } catch (capacitorError) {
          console.warn('⚠️ useGeolocation: Erreur Capacitor (tentative', retryCount + 1, '):', capacitorError);
          
          // Retry logic pour Capacitor
          if (retryCount < maxRetries && capacitorError.message.includes('timeout')) {
            console.log('🔄 useGeolocation: Retry Capacitor...');
            return getCurrentPosition(retryCount + 1);
          }
          
          console.log('🔄 Essai fallback Navigator dans AAB...');
          
          // Fallback Navigator même en mode natif (pour AAB défaillant)
          if (!navigator.geolocation) {
            throw new Error('Navigator.geolocation indisponible');
          }
          
          return new Promise((resolve, reject) => {
            const navigatorStartTime = Date.now();
            const timeoutId = setTimeout(() => {
              reject(new Error('Timeout Navigator fallback'));
            }, 15000);
            
            navigator.geolocation.getCurrentPosition(
              (geoPosition) => {
                clearTimeout(timeoutId);
                const pos = {
                  lat: geoPosition.coords.latitude,
                  lng: geoPosition.coords.longitude
                };
                console.log('✅ Position Navigator fallback obtenue en', Date.now() - navigatorStartTime, 'ms:', pos);
                setPosition(pos);
                resolve(pos);
              },
              (navError) => {
                clearTimeout(timeoutId);
                console.error('❌ Navigator fallback échoué:', navError);
                
                // Dernier recours : retry avec navigator si timeout
                if (retryCount < maxRetries && navError.code === 3) { // TIMEOUT
                  console.log('🔄 useGeolocation: Retry navigator...');
                  setTimeout(() => {
                    getCurrentPosition(retryCount + 1).then(resolve).catch(reject);
                  }, 1000);
                } else {
                  reject(navError);
                }
              },
              {
                enableHighAccuracy: deviceInfo.manufacturer !== 'Samsung', // Samsung parfois problématique avec high accuracy
                timeout: 15000,
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
        const navigatorStartTime = Date.now();
        const timeoutId = setTimeout(() => {
          reject(new Error('Timeout géolocalisation web'));
        }, 15000);
        
        navigator.geolocation.getCurrentPosition(
          (geoPosition) => {
            clearTimeout(timeoutId);
            const pos = {
              lat: geoPosition.coords.latitude,
              lng: geoPosition.coords.longitude
            };
            console.log('✅ Position Web obtenue en', Date.now() - navigatorStartTime, 'ms:', pos);
            setPosition(pos);
            resolve(pos);
          },
          (error) => {
            clearTimeout(timeoutId);
            console.error('❌ Erreur Web:', error);
            
            // Retry logic pour le web aussi
            if (retryCount < maxRetries && error.code === 3) { // TIMEOUT
              console.log('🔄 useGeolocation: Retry navigator web...');
              setTimeout(() => {
                getCurrentPosition(retryCount + 1).then(resolve).catch(reject);
              }, 1000);
            } else {
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
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 300000
          }
        );
      });
      
    } catch (error) {
      console.error('❌ useGeolocation: Erreur fatale (tentative', retryCount + 1, '):', error, 'Device:', deviceInfo);
      
      // Retry logic global
      if (retryCount < maxRetries) {
        console.log('🔄 useGeolocation: Retry global...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return getCurrentPosition(retryCount + 1);
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isNative, getDeviceInfo]);

  return {
    position,
    loading,
    getCurrentPosition,
    checkPermissions,
    requestPermissions
  };
};