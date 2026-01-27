import { useState, useCallback, useEffect } from 'react';
import { Position } from '@/types/permissions';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export const useGeolocation = () => {
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);

  // Détection du fabricant et de la version Android
  const getDeviceInfo = useCallback(() => {
    const userAgent = navigator.userAgent;
    const androidInfo = (window as any).AndroidDeviceInfo;
    
    // Utiliser les infos injectées par MainActivity si disponibles
    if (androidInfo) {
      console.log('🔍 Device info depuis MainActivity:', androidInfo);
      return {
        manufacturer: androidInfo.manufacturer,
        model: androidInfo.model,
        version: androidInfo.version,
        sdkInt: androidInfo.sdkInt,
        isMIUI: androidInfo.isMIUI,
        isSamsung: androidInfo.isSamsung,
        isOnePlus: androidInfo.isOnePlus,
        isOppo: androidInfo.isOppo,
        isVivo: androidInfo.isVivo,
        isHuawei: androidInfo.isHuawei,
        needsSpecialHandling: androidInfo.needsSpecialHandling
      };
    }
    
    // Fallback sur détection UserAgent
    const androidVersion = userAgent.match(/Android (\d+(?:\.\d+)?)/)?.[1] || 'unknown';
    const manufacturer = userAgent.includes('Samsung') ? 'samsung' :
                        userAgent.includes('Xiaomi') ? 'xiaomi' :
                        userAgent.includes('Huawei') ? 'huawei' :
                        userAgent.includes('OnePlus') ? 'oneplus' :
                        userAgent.includes('Oppo') ? 'oppo' :
                        userAgent.includes('Vivo') ? 'vivo' :
                        'unknown';
    
    const deviceInfo = { 
      manufacturer, 
      version: androidVersion, 
      sdkInt: androidVersion ? parseInt(androidVersion) : 0,
      isMIUI: manufacturer === 'xiaomi',
      isSamsung: manufacturer === 'samsung',
      needsSpecialHandling: ['xiaomi', 'samsung', 'huawei', 'oneplus', 'oppo', 'vivo'].includes(manufacturer)
    };
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

  const checkPermissions = async (): Promise<{ location: string; coarseLocation: string }> => {
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

  const handleManufacturerSpecificPermissions = async (deviceInfo: any): Promise<{ granted: boolean; message?: string }> => {
    const manufacturerName = deviceInfo.manufacturer?.toLowerCase() || 'unknown';
    
    console.log('🔧 Gestion spécifique fabricant:', manufacturerName);
    
    const messages: Record<string, string> = {
      xiaomi: 'Sur les appareils Xiaomi/MIUI, accédez à Paramètres → Applications → RunConnect → Permissions → Position et activez "Autoriser tout le temps"',
      samsung: 'Sur Samsung, vérifiez Paramètres → Applications → RunConnect → Permissions → Localisation et sélectionnez "Autoriser tout le temps"',
      huawei: 'Sur Huawei/Honor, allez dans Paramètres → Applications → RunConnect → Autorisations → Localisation et activez "Autoriser"',
      oneplus: 'Sur OnePlus, vérifiez Paramètres → Applications → RunConnect → Autorisations → Localisation',
      oppo: 'Sur Oppo, accédez à Paramètres → Confidentialité → Gestionnaire d\'autorisations → Localisation → RunConnect',
      vivo: 'Sur Vivo, allez dans Paramètres → Confidentialité → Gestionnaire d\'autorisations → Localisation → RunConnect'
    };

    const message = messages[manufacturerName] || 
      'Accédez aux Paramètres de votre téléphone → Applications → RunConnect → Permissions et activez la géolocalisation';

    return { granted: false, message };
  };

  const requestPermissions = async (): Promise<{ granted: boolean; message?: string }> => {
    console.log('🧪 REQUEST PERMISSIONS...');
    const currentPlatform = Capacitor.getPlatform();
    
    try {
      // 🍎 iOS: Utiliser directement Capacitor Geolocation (déclenche la popup native iOS)
      if (currentPlatform === 'ios') {
        console.log('🍎📍 Request permissions iOS via Capacitor');
        try {
          const result = await Geolocation.requestPermissions();
          const granted = result.location === 'granted';
          console.log('🍎📍 Résultat popup iOS:', granted ? 'GRANTED ✅' : 'DENIED ❌');
          return { granted };
        } catch (error) {
          console.error('🍎📍 Erreur request iOS:', error);
          return { granted: false, message: 'Erreur demande permission iOS' };
        }
      }
      
      // 🤖 Android natif avec plugin
      if (isNative() && (window as any).PermissionsPlugin) {
        console.log('🤖🧪 Request permissions via plugin Android');
        
        const deviceInfo = getDeviceInfo();
        const isAndroid10Plus = deviceInfo?.sdkInt >= 29;
        
        console.log('🤖📱 Info périphérique pour permissions:', {
          manufacturer: deviceInfo?.manufacturer,
          sdkInt: deviceInfo?.sdkInt,
          isAndroid10Plus,
          needsSpecialHandling: deviceInfo?.needsSpecialHandling
        });
        
        let result: boolean;
        
        if (isAndroid10Plus) {
          console.log('🤖🧪 Android 10+ détecté - demande séquentielle des permissions');
          
          result = await (window as any).PermissionsPlugin.forceRequestLocationPermissions();
          
          if (result) {
            try {
              const backgroundResult = await (window as any).PermissionsPlugin.forceRequestLocationPermissionsAndroid10();
              console.log('🤖📱 Résultat permission arrière-plan:', backgroundResult);
              result = backgroundResult;
            } catch (bgError) {
              console.warn('🤖⚠️ Permission arrière-plan échouée, mais permission de base OK:', bgError);
            }
          }
        } else {
          result = await (window as any).PermissionsPlugin.forceRequestLocationPermissions();
        }
        
        if (!result && deviceInfo?.needsSpecialHandling) {
          return await handleManufacturerSpecificPermissions(deviceInfo);
        }
        
        return { granted: result };
      }

      // Fallback Capacitor standard (Android sans plugin ou autres cas)
      if (isNative()) {
        console.log('📱 Request permissions Capacitor standard');
        const deviceInfo = getDeviceInfo();
        const result = await Geolocation.requestPermissions();
        console.log('📱 Résultat demande permissions:', result, 'Device:', deviceInfo);
        
        if (result.location === 'denied' && deviceInfo?.needsSpecialHandling) {
          return await handleManufacturerSpecificPermissions(deviceInfo);
        }
        
        return { granted: result.location === 'granted' };
      }

      // Sur web
      console.log('🌐 Request permissions web');
      if (navigator.geolocation) {
        return { granted: true };
      } else {
        return { granted: false, message: 'Géolocalisation non supportée par ce navigateur' };
      }
    } catch (error) {
      console.log('❌ Erreur request permissions:', error);
      return { granted: false, message: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
  };

  const getCurrentPosition = useCallback(async (retryCount = 0): Promise<Position | null> => {
    console.log('🚀 useGeolocation: Début getCurrentPosition, native:', isNative(), 'retry:', retryCount);
    const deviceInfo = getDeviceInfo();
    const maxRetries = 2;
    
    setLoading(true);

    try {
      // ✅ NOUVEAU : Toujours vérifier et demander les permissions AVANT d'essayer de récupérer la position
      const nativeMode = isNative();
      
      if (nativeMode) {
        console.log('🔐 Vérification permissions avant getCurrentPosition...');
        
        // Vérifier d'abord si on a déjà les permissions
        const permissionCheck = await checkPermissions();
        console.log('🔐 État permissions:', permissionCheck);
        
        // Si permissions non accordées, les demander EXPLICITEMENT
        if (permissionCheck.location !== 'granted') {
          console.log('🔐 Permissions non accordées, demande explicite...');
          const requestResult = await requestPermissions();
          
          if (!requestResult.granted) {
            console.error('❌ Permissions refusées par l\'utilisateur');
            throw new Error('Permissions de localisation refusées');
          }
          
          console.log('✅ Permissions accordées !');
          
          // Attendre un peu pour que les permissions soient bien enregistrées
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Attendre que les flags soient injectés par MainActivity (AAB fix)
      const waitTime = retryCount === 0 ? 1000 : 500;
      await new Promise(resolve => setTimeout(resolve, waitTime));
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
              enableHighAccuracy: deviceInfo.manufacturer !== 'samsung', // Samsung parfois problématique
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
                enableHighAccuracy: deviceInfo.manufacturer !== 'samsung', // Samsung parfois problématique avec high accuracy
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

  // Écouter les changements de permissions Android
  useEffect(() => {
    const handlePermissionsUpdate = (event: any) => {
      console.log('🔔 Mise à jour permissions Android reçue:', event.detail);
      
      // Si la localisation vient d'être accordée, on pourrait relancer getCurrentPosition
      if (event.detail?.location === true) {
        console.log('✅ Permission localisation accordée via popup Android');
      }
    };
    
    window.addEventListener('androidPermissionsUpdated', handlePermissionsUpdate);
    
    return () => {
      window.removeEventListener('androidPermissionsUpdated', handlePermissionsUpdate);
    };
  }, []);

  return {
    position,
    loading,
    getCurrentPosition,
    checkPermissions,
    requestPermissions
  };
};