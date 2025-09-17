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
    console.log('🔥 ANDROID DÉTECTÉ - Force Capacitor Geolocation');
    
    try {
      // FORCE demande permissions Capacitor même si "web"
      const permissions = await Geolocation.requestPermissions();
      console.log('🔥 Permissions forcées result:', permissions);
      
      if (permissions.location === 'granted' || permissions.coarseLocation === 'granted') {
        return { success: true, permissions };
      } else {
        throw new Error('Permissions refusées');
      }
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
    console.log('🔥 ANDROID DÉTECTÉ - Force Capacitor Position');
    
    // Stratégies ultra-permissives spécifiquement pour anciens Android
    const strategies = [
      { enableHighAccuracy: false, timeout: 120000, maximumAge: 14400000 }, // 4h cache, 2min timeout
      { enableHighAccuracy: false, timeout: 60000, maximumAge: 7200000 },   // 2h cache, 1min timeout
      { enableHighAccuracy: false, timeout: 30000, maximumAge: 1800000 },   // 30min cache
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 },    // 10min cache
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 300000 },     // 5min cache, précis
    ];
    
    for (let i = 0; i < strategies.length; i++) {
      const strategy = strategies[i];
      console.log(`🔥 Tentative ${i + 1}/5:`, strategy);
      
      try {
        const position = await Geolocation.getCurrentPosition(strategy);
        console.log(`🔥 SUCCÈS tentative ${i + 1}:`, position.coords);
        
        return {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          strategy: i + 1
        };
      } catch (error) {
        console.log(`🔥 Échec tentative ${i + 1}:`, error);
        
        if (i === strategies.length - 1) {
          throw new Error(`Toutes les tentatives échouées: ${error}`);
        }
        
        // Délai entre tentatives
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
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
    console.log('🔥 ANDROID DÉTECTÉ - Force Capacitor Camera');
    
    try {
      // FORCE demande permissions Capacitor même si "web"
      const permissions = await Camera.requestPermissions();
      console.log('🔥 Camera permissions forcées:', permissions);
      
      if (permissions.camera === 'granted' && permissions.photos === 'granted') {
        return { success: true, permissions };
      } else {
        throw new Error('Permissions caméra refusées');
      }
    } catch (error) {
      console.error('🔥 Erreur camera permissions:', error);
      throw error;
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
    console.log('🔥 ANDROID DÉTECTÉ - Force Capacitor Gallery');
    
    // Essayer plusieurs configurations
    const configs = [
      {
        source: CameraSource.Photos,
        resultType: CameraResultType.Uri,
        quality: 90,
        correctOrientation: true,
        saveToGallery: false,
        allowEditing: false
      },
      {
        source: CameraSource.Photos,
        resultType: CameraResultType.DataUrl,
        quality: 80,
        correctOrientation: false,
        saveToGallery: false,
        allowEditing: false
      },
      // Fallback minimal
      {
        source: CameraSource.Photos,
        resultType: CameraResultType.Uri,
        quality: 70
      }
    ];
    
    for (let i = 0; i < configs.length; i++) {
      console.log(`🔥 Config galerie ${i + 1}/3`);
      
      try {
        const photo = await Camera.getPhoto(configs[i]);
        console.log(`🔥 SUCCÈS galerie config ${i + 1}:`, photo.webPath || photo.path);
        
        return photo.webPath || photo.path || photo.dataUrl;
      } catch (error) {
        console.log(`🔥 Échec config ${i + 1}:`, error);
        
        if (i === configs.length - 1) {
          throw new Error(`Toutes les configs galerie échouées: ${error}`);
        }
      }
    }
  } else {
    throw new Error('Appareil non-Android');
  }
}