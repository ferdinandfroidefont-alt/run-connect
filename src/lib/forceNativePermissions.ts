import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

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
export async function forceGeolocationPermissions() {
  console.log('🔥 FORCE Geolocation - BYPASS platform check');
  
  try {
    // FORCER l'utilisation de Capacitor SANS vérifier la plateforme
    console.log('🔥 FORCE Capacitor Geolocation directement');
    const permissions = await Geolocation.requestPermissions();
    console.log('🔥 Permissions FORCÉES result:', permissions);
    
    if (permissions.location === 'granted' || permissions.coarseLocation === 'granted') {
      return { success: true, permissions, method: 'capacitor-forced' };
    } else {
      throw new Error('Permissions refusées par l\'utilisateur');
    }
  } catch (error) {
    console.error('🔥 Erreur permissions FORCÉES:', error);
    // Si ça échoue vraiment, on peut essayer le web en dernier recours
    if (navigator.geolocation) {
      console.log('🔥 Dernier recours: Web permissions');
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        return { success: true, permissions: { location: permission.state }, method: 'web-fallback' };
      } catch (webError) {
        throw new Error(`Toutes les méthodes échouées: ${error}`);
      }
    }
    throw error;
  }
}

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
  console.log('🔥 FORCE Camera - BYPASS platform check');
  
  try {
    // FORCER l'utilisation de Camera SANS vérifier la plateforme
    console.log('🔥 FORCE Capacitor Camera directement');
    const permissions = await Camera.requestPermissions();
    console.log('🔥 Camera permissions FORCÉES:', permissions);
    
    if (permissions.camera === 'granted' && permissions.photos === 'granted') {
      return { success: true, permissions, method: 'capacitor-forced' };
    } else if (permissions.camera === 'granted' || permissions.photos === 'granted') {
      // Au moins une permission accordée
      return { success: true, permissions, method: 'capacitor-partial' };
    } else {
      throw new Error('Permissions caméra refusées par l\'utilisateur');
    }
  } catch (error) {
    console.error('🔥 Erreur camera permissions FORCÉES:', error);
    // Même en cas d'erreur, on peut dire qu'on va utiliser l'input file
    console.log('🔥 Dernier recours: input file sera utilisé');
    return { success: true, permissions: { camera: 'web-fallback', photos: 'web-fallback' }, method: 'web-fallback' };
  }
}

/**
 * FORCE ouverture galerie avec stratégies multiples
 */
export async function forceOpenGallery() {
  console.log('🔥 FORCE Gallery - BYPASS platform check');
  
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
}