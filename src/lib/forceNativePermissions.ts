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
  console.log('🔥 FORCE Geolocation - Détection Android:', isRealAndroidDevice());
  
  if (isRealAndroidDevice()) {
    console.log('🔥 ANDROID DÉTECTÉ - Tentative Capacitor puis Web API');
    
    try {
      // Vérifier si Geolocation est vraiment disponible
      if (Geolocation && typeof Geolocation.requestPermissions === 'function') {
        console.log('🔥 Capacitor Geolocation disponible, tentative...');
        const permissions = await Geolocation.requestPermissions();
        console.log('🔥 Permissions Capacitor result:', permissions);
        
        if (permissions.location === 'granted' || permissions.coarseLocation === 'granted') {
          return { success: true, permissions, method: 'capacitor' };
        }
      }
      
      // Si Capacitor échoue, utiliser Web API directement
      console.log('🔥 Fallback vers Web Geolocation API');
      if (navigator.geolocation) {
        // Sur Android, même en WebView, on peut accéder aux permissions web
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        console.log('🔥 Web permission état:', permission.state);
        
        if (permission.state === 'granted' || permission.state === 'prompt') {
          return { success: true, permissions: { location: 'granted' }, method: 'web' };
        }
      }
      
      throw new Error('Aucune API géolocalisation disponible');
    } catch (error) {
      console.error('🔥 Erreur permissions forcées:', error);
      throw error;
    }
  } else {
    // Web fallback
    return { success: false, reason: 'Not Android device' };
  }
}

/**
 * FORCE géolocalisation avec toutes les stratégies possibles
 */
export async function forceGetPosition() {
  console.log('🔥 FORCE Position - Détection Android:', isRealAndroidDevice());
  
  if (isRealAndroidDevice()) {
    console.log('🔥 ANDROID DÉTECTÉ - Tentative Capacitor puis Web');
    
    // D'abord essayer Capacitor si disponible
    if (Geolocation && typeof Geolocation.getCurrentPosition === 'function') {
      const strategies = [
        { enableHighAccuracy: false, timeout: 30000, maximumAge: 600000 },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }
      ];
      
      for (let i = 0; i < strategies.length; i++) {
        try {
          console.log(`🔥 Capacitor tentative ${i + 1}:`, strategies[i]);
          const position = await Geolocation.getCurrentPosition(strategies[i]);
          console.log(`🔥 Capacitor SUCCÈS ${i + 1}:`, position.coords);
          
          return {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            method: 'capacitor',
            strategy: i + 1
          };
        } catch (error) {
          console.log(`🔥 Capacitor échec ${i + 1}:`, error);
        }
      }
    }
    
    // Fallback vers Web Geolocation API
    console.log('🔥 Fallback vers navigator.geolocation');
    if (navigator.geolocation) {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('🔥 Web API SUCCÈS:', position.coords);
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              method: 'web'
            });
          },
          (error) => {
            console.error('🔥 Web API échec:', error);
            reject(new Error(`Web Geolocation échec: ${error.message}`));
          },
          {
            enableHighAccuracy: false,
            timeout: 30000,
            maximumAge: 600000
          }
        );
      });
    }
    
    throw new Error('Aucune API géolocalisation disponible');
  } else {
    throw new Error('Appareil non-Android');
  }
}

/**
 * FORCE permissions caméra même si Capacitor dit "web"
 */
export async function forceCameraPermissions() {
  console.log('🔥 FORCE Camera - Détection Android:', isRealAndroidDevice());
  
  if (isRealAndroidDevice()) {
    console.log('🔥 ANDROID DÉTECTÉ - Tentative Capacitor puis Web');
    
    try {
      // Vérifier si Camera est disponible
      if (Camera && typeof Camera.requestPermissions === 'function') {
        console.log('🔥 Capacitor Camera disponible, tentative...');
        const permissions = await Camera.requestPermissions();
        console.log('🔥 Camera permissions Capacitor:', permissions);
        
        if (permissions.camera === 'granted' && permissions.photos === 'granted') {
          return { success: true, permissions, method: 'capacitor' };
        }
      }
      
      // Fallback: sur Android WebView, on peut souvent utiliser input file
      console.log('🔥 Fallback vers Web API (input file sera utilisé)');
      return { success: true, permissions: { camera: 'granted', photos: 'granted' }, method: 'web' };
      
    } catch (error) {
      console.error('🔥 Erreur camera permissions:', error);
      // Même en cas d'erreur, on peut essayer l'input file
      return { success: true, permissions: { camera: 'granted', photos: 'granted' }, method: 'web-fallback' };
    }
  } else {
    return { success: false, reason: 'Not Android device' };
  }
}

/**
 * FORCE ouverture galerie avec stratégies multiples
 */
export async function forceOpenGallery() {
  console.log('🔥 FORCE Gallery - Détection Android:', isRealAndroidDevice());
  
  if (isRealAndroidDevice()) {
    console.log('🔥 ANDROID DÉTECTÉ - Tentative Capacitor puis Web input');
    
    // D'abord essayer Capacitor si disponible
    if (Camera && typeof Camera.getPhoto === 'function') {
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
          console.log(`🔥 Capacitor config ${i + 1}`);
          const photo = await Camera.getPhoto(configs[i]);
          console.log(`🔥 Capacitor SUCCÈS ${i + 1}:`, photo.webPath || photo.path);
          
          return photo.webPath || photo.path || photo.dataUrl;
        } catch (error) {
          console.log(`🔥 Capacitor échec ${i + 1}:`, error);
        }
      }
    }
    
    // Fallback vers input file HTML
    console.log('🔥 Fallback vers input file HTML');
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
      
      input.click();
    });
  } else {
    throw new Error('Appareil non-Android');
  }
}