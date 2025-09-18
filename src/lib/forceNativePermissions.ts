import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { androidPermissions } from './androidPermissions';

/** 
 * SOLUTION DÉFINITIVE pour AAB Play Store
 * Force TOUJOURS les APIs Capacitor sur Android, même si détecté comme web
 */

export const isRealAndroidDevice = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.includes('android') && 
         (userAgent.includes('wv') || 
          !userAgent.includes('chrome') || 
          userAgent.includes('version'));
};

/**
 * FORCE les permissions géolocalisation même si Capacitor dit "web"
 */
export const forceGeolocationPermissions = async (): Promise<void> => {
  console.log('🔥 FORCE demande permissions géolocalisation');
  
  // D'abord essayer le plugin Android natif
  if (androidPermissions.isAndroid()) {
    const granted = await androidPermissions.forceRequestLocationPermissions();
    if (granted) {
      console.log('🔥 Permissions géolocalisation accordées via plugin Android');
      return;
    }
    console.log('🔥 Plugin Android échoué, tentative Capacitor');
  }
  
  try {
    // Forcer l'utilisation de l'API Capacitor même si elle pense être sur le web
    const result = await Geolocation.requestPermissions();
    console.log('🔥 Permissions géolocalisation (Capacitor):', result);
    
    if (result.location !== 'granted') {
      throw new Error('Permissions géolocalisation refusées');
    }
  } catch (error: any) {
    console.log('🔥 Capacitor échoué, tentative web fallback:', error);
    
    // Fallback web si Capacitor échoue
    if (navigator.permissions) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        console.log('🔥 Permission géolocalisation web:', permission.state);
        
        if (permission.state === 'prompt') {
          // Déclencher la demande de permission via getCurrentPosition
          await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000
            });
          });
        }
      } catch (webError) {
        console.error('🔥 Fallback web aussi échoué:', webError);
        throw new Error('Permissions géolocalisation impossibles à obtenir');
      }
    } else {
      throw error;
    }
  }
};

/**
 * FORCE géolocalisation avec toutes les stratégies possibles
 */
export async function forceGetPosition() {
  console.log('🔥 FORCE Position - BYPASS platform check');
  
  try {
    // FORCER Capacitor directement sans vérifier la plateforme
    console.log('🔥 FORCE Capacitor Position directement');
    
    const strategies = [
      { enableHighAccuracy: false, timeout: 30000, maximumAge: 600000 },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 },
      { enableHighAccuracy: false, timeout: 60000, maximumAge: 1800000 }
    ];
    
    for (let i = 0; i < strategies.length; i++) {
      try {
        console.log(`🔥 Capacitor FORCÉ tentative ${i + 1}:`, strategies[i]);
        const position = await Geolocation.getCurrentPosition(strategies[i]);
        console.log(`🔥 Capacitor FORCÉ SUCCÈS ${i + 1}:`, position.coords);
        
        return {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          method: 'capacitor-forced',
          strategy: i + 1
        };
      } catch (error) {
        console.log(`🔥 Capacitor FORCÉ échec ${i + 1}:`, error);
        if (i === strategies.length - 1) {
          throw error;
        }
      }
    }
  } catch (capacitorError) {
    console.error('🔥 Capacitor FORCÉ totalement échoué:', capacitorError);
    
    // Dernier recours: Web API
    if (navigator.geolocation) {
      console.log('🔥 Dernier recours: Web Geolocation');
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('🔥 Web API SUCCÈS:', position.coords);
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              method: 'web-fallback'
            });
          },
          (error) => {
            console.error('🔥 Web API échec:', error);
            reject(new Error(`Toutes les APIs échouées: ${capacitorError.message}`));
          },
          {
            enableHighAccuracy: false,
            timeout: 30000,
            maximumAge: 600000
          }
        );
      });
    }
    
    throw new Error(`Géolocalisation impossible: ${capacitorError.message}`);
  }
}

/**
 * FORCE permissions caméra même si Capacitor dit "web"
 */
export async function forceCameraPermissions() {
  console.log('🔥 FORCE demande permissions caméra');
  
  // D'abord essayer le plugin Android natif
  if (androidPermissions.isAndroid()) {
    const granted = await androidPermissions.forceRequestCameraPermissions();
    if (granted) {
      console.log('🔥 Permissions caméra accordées via plugin Android');
      return;
    }
    console.log('🔥 Plugin Android échoué, tentative Capacitor');
  }
  
  try {
    // Forcer l'utilisation de l'API Capacitor même si elle pense être sur le web
    const result = await Camera.requestPermissions();
    console.log('🔥 Permissions caméra (Capacitor):', result);
    
    if (result.camera !== 'granted' || result.photos !== 'granted') {
      throw new Error('Permissions caméra refusées');
    }
  } catch (error: any) {
    console.log('🔥 Capacitor caméra échoué, utilisation fallback web:', error);
    
    // Pour le web, on ne peut pas vraiment demander les permissions caméra
    // mais on peut indiquer qu'un input file sera utilisé
    if (Capacitor.getPlatform() === 'web') {
      console.log('🔥 Mode web - utilisation input file');
      return;
    }
    
    throw error;
  }
}

/**
 * FORCE ouverture galerie avec stratégies multiples
 */
export const forceOpenGallery = async (): Promise<string | null> => {
  console.log('🔥 FORCE Gallery - BYPASS platform check avec support MIUI');
  
  // D'abord essayer le plugin Android natif pour MIUI
  if (androidPermissions.isAndroid()) {
    try {
      const result = await androidPermissions.forceOpenGallery();
      if (result.success) {
        console.log('🔥 Galerie ouverte via plugin Android natif:', result.method);
        return 'native-plugin-success';
      }
    } catch (error) {
      console.log('🔥 Plugin Android galerie échoué, tentative Capacitor:', error);
    }
  }
  
  try {
    // FORCER Capacitor directement sans vérifier la plateforme
    console.log('🔥 FORCE Capacitor Gallery directement');
    
    const configs = [
      {
        source: CameraSource.Photos,
        resultType: CameraResultType.Uri,
        quality: 90,
        saveToGallery: false,
        allowEditing: false
      },
      {
        source: CameraSource.Photos,
        resultType: CameraResultType.DataUrl,
        quality: 80,
        saveToGallery: false
      }
    ];
    
    for (let i = 0; i < configs.length; i++) {
      try {
        console.log(`🔥 Capacitor FORCÉ config ${i + 1}`);
        const photo = await Camera.getPhoto(configs[i]);
        console.log(`🔥 Capacitor FORCÉ SUCCÈS ${i + 1}:`, photo.webPath || photo.path);
        
        return photo.webPath || photo.path || photo.dataUrl;
      } catch (error) {
        console.log(`🔥 Capacitor FORCÉ échec ${i + 1}:`, error);
        if (i === configs.length - 1) {
          throw error;
        }
      }
    }
  } catch (capacitorError) {
    console.error('🔥 Capacitor FORCÉ Gallery totalement échoué:', capacitorError);
    
    // Dernier recours: input file HTML
    console.log('🔥 Dernier recours: input file HTML');
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; // Force l'utilisation de la caméra si disponible
      
      input.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
          const url = URL.createObjectURL(file);
          console.log('🔥 Web input file SUCCÈS:', url);
          resolve(url);
        } else {
          reject(new Error('Aucun fichier sélectionné'));
        }
      };
      
      input.onclick = () => {
        console.log('🔥 Input file cliqué');
      };
      
      input.click();
    });
  }
};