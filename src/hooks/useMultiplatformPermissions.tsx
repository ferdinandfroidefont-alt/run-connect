import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { Geolocation } from '@capacitor/geolocation';
import { Camera } from '@capacitor/camera';
import { openAppSettings, getPermissionInstructions } from '@/lib/permissions';
import { useToast } from '@/hooks/use-toast';

export interface PermissionStatus {
  notifications: boolean;
  location: boolean;
  camera: boolean;
  contacts: boolean;
  hasRefused: boolean;
}

export const useMultiplatformPermissions = () => {
  const platform = Capacitor.getPlatform();
  // ✅ CORRIGÉ: Utiliser le flag défini dans main.tsx comme fallback
  const isNative = (window as any).CapacitorForceNative === true || Capacitor.isNativePlatform();
  const platformEmoji = platform === 'ios' ? '🍎' : platform === 'android' ? '🤖' : '🌐';
  const { toast } = useToast();
  
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>({
    notifications: false,
    location: false,
    camera: false,
    contacts: false,
    hasRefused: false
  });
  
  const [isRequesting, setIsRequesting] = useState(false);

  const requestAllPermissions = async () => {
    if (!isNative) {
      console.log('🌐 [WEB] Plateforme web détectée, permissions limitées');
      return;
    }

    console.log(`📱 Plateforme détectée : ${platform}`);
    console.log(`${platformEmoji} [${platform.toUpperCase()}] Démarrage demande permissions...`);
    
    setIsRequesting(true);
    let hasAnyRefused = false;

    try {
      if (platform === 'android') {
        hasAnyRefused = await requestAndroidPermissions();
      } else if (platform === 'ios') {
        hasAnyRefused = await requestIOSPermissions();
      }
      
      setPermissionStatus(prev => ({ ...prev, hasRefused: hasAnyRefused }));
      
      if (hasAnyRefused) {
        toast({
          title: "Permissions nécessaires",
          description: "Certaines permissions sont requises pour profiter pleinement de RunConnect",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Permissions accordées",
          description: "Toutes les permissions ont été accordées avec succès",
        });
      }
    } catch (error) {
      console.error(`❌ [${platform.toUpperCase()}] Erreur globale permissions:`, error);
    } finally {
      setIsRequesting(false);
    }
  };

  const requestAndroidPermissions = async (): Promise<boolean> => {
    let hasRefused = false;

    // 1. Notifications - SOLUTION 3: Appel direct AndroidBridge
    console.log('🤖 [ANDROID] Demande permission notifications via AndroidBridge...');
    try {
      // @ts-ignore - AndroidBridge natif
      if (typeof window.AndroidBridge?.requestNotificationPermissions === 'function') {
        console.log('✅ [ANDROID] AndroidBridge trouvé, appel requestNotificationPermissions()');
        
        // Créer une Promise pour gérer le callback asynchrone
        const notificationPromise = new Promise<boolean>((resolve) => {
          // Timeout de sécurité
          const timeout = setTimeout(() => {
            console.log('⏱️ [ANDROID] Timeout permission notifications');
            resolve(false);
          }, 30000); // 30 secondes max
          
          // Écouter le résultat
          const handler = (event: any) => {
            clearTimeout(timeout);
            const granted = event.detail?.granted === true;
            console.log('📱 [ANDROID] Résultat popup notifications:', granted ? 'ACCORDÉ ✅' : 'REFUSÉ ❌');
            window.removeEventListener('androidPermissionsUpdated', handler);
            resolve(granted);
          };
          
          window.addEventListener('androidPermissionsUpdated', handler);
        });
        
        // Déclencher la demande de permission
        window.AndroidBridge.requestNotificationPermissions();
        
        // Attendre le résultat
        const granted = await notificationPromise;
        
        if (granted) {
          console.log('✅ [ANDROID] Permission notifications accordée via AndroidBridge');
          setPermissionStatus(prev => ({ ...prev, notifications: true }));
        } else {
          console.log('❌ [ANDROID] Permission notifications refusée');
          hasRefused = true;
        }
      } else {
        console.error('❌ [ANDROID] AndroidBridge.requestNotificationPermissions non trouvé !');
        hasRefused = true;
      }
    } catch (error) {
      console.error('❌ [ANDROID] Erreur permission notifications:', error);
      hasRefused = true;
    }

    // 2. Localisation
    console.log('🤖 [ANDROID] Demande permission localisation...');
    try {
      const locationResult = await Geolocation.requestPermissions();
      if (locationResult.location === 'granted') {
        console.log('✅ [ANDROID] Permission localisation accordée');
        setPermissionStatus(prev => ({ ...prev, location: true }));
      } else {
        console.log('❌ [ANDROID] Permission localisation refusée');
        hasRefused = true;
      }
    } catch (error) {
      console.error('❌ [ANDROID] Erreur permission localisation:', error);
      hasRefused = true;
    }

    // 3. Caméra
    console.log('🤖 [ANDROID] Demande permission caméra...');
    try {
      const cameraResult = await Camera.requestPermissions();
      if (cameraResult.camera === 'granted' && cameraResult.photos === 'granted') {
        console.log('✅ [ANDROID] Permission caméra accordée');
        setPermissionStatus(prev => ({ ...prev, camera: true }));
      } else {
        console.log('❌ [ANDROID] Permission caméra refusée');
        hasRefused = true;
      }
    } catch (error) {
      console.error('❌ [ANDROID] Erreur permission caméra:', error);
      hasRefused = true;
    }

    // 4. Contacts (Android uniquement)
    console.log('🤖 [ANDROID] Demande permission contacts...');
    try {
      // Note: Les contacts nécessitent un plugin spécifique déjà configuré
      if (typeof window.AndroidBridge?.requestContactsPermission === 'function') {
        window.AndroidBridge.requestContactsPermission();
        // On considère que c'est demandé (on ne peut pas vérifier le résultat synchrone)
        console.log('✅ [ANDROID] Permission contacts demandée');
        setPermissionStatus(prev => ({ ...prev, contacts: true }));
      } else {
        console.log('⚠️ [ANDROID] Plugin contacts non disponible');
      }
    } catch (error) {
      console.error('❌ [ANDROID] Erreur permission contacts:', error);
      hasRefused = true;
    }

    return hasRefused;
  };

  const requestIOSPermissions = async (): Promise<boolean> => {
    let hasRefused = false;

    // 1. Notifications
    console.log('🍎 [IOS] Demande permission notifications...');
    try {
      const notifResult = await PushNotifications.requestPermissions();
      if (notifResult.receive === 'granted') {
        console.log('✅ [IOS] Permission notifications accordée');
        await PushNotifications.register();
        setPermissionStatus(prev => ({ ...prev, notifications: true }));
      } else {
        console.log('❌ [IOS] Permission notifications refusée');
        hasRefused = true;
      }
    } catch (error) {
      console.error('❌ [IOS] Erreur permission notifications:', error);
      hasRefused = true;
    }

    // 2. Localisation
    console.log('🍎 [IOS] Demande permission localisation...');
    try {
      const locationResult = await Geolocation.requestPermissions();
      if (locationResult.location === 'granted') {
        console.log('✅ [IOS] Permission localisation accordée');
        setPermissionStatus(prev => ({ ...prev, location: true }));
      } else {
        console.log('❌ [IOS] Permission localisation refusée');
        hasRefused = true;
      }
    } catch (error) {
      console.error('❌ [IOS] Erreur permission localisation:', error);
      hasRefused = true;
    }

    // 3. Caméra
    console.log('🍎 [IOS] Demande permission caméra...');
    try {
      const cameraResult = await Camera.requestPermissions();
      if (cameraResult.camera === 'granted' && cameraResult.photos === 'granted') {
        console.log('✅ [IOS] Permission caméra accordée');
        setPermissionStatus(prev => ({ ...prev, camera: true }));
      } else {
        console.log('❌ [IOS] Permission caméra refusée');
        hasRefused = true;
      }
    } catch (error) {
      console.error('❌ [IOS] Erreur permission caméra:', error);
      hasRefused = true;
    }

    // Note: Les contacts ne sont pas supportés sur iOS sans plugin spécial
    console.log('ℹ️ [IOS] Contacts non supportés sur iOS (nécessite plugin spécifique)');

    return hasRefused;
  };

  const openSettings = async () => {
    await openAppSettings();
  };

  const getInstructions = (permission: string) => {
    return getPermissionInstructions(permission);
  };

  return {
    platform,
    isNative,
    permissionStatus,
    isRequesting,
    requestAllPermissions,
    openSettings,
    getInstructions
  };
};
