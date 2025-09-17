import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { 
  forceGeolocationPermissions, 
  forceGetPosition, 
  forceCameraPermissions, 
  forceOpenGallery,
  isRealAndroidDevice
} from './forceNativePermissions';

/** Initialiser les permissions natives avec FORCE Android */
export async function requestNativePermissionsOnce() {
  console.log('🔥 FORCE permissions natives - Détection Android:', isRealAndroidDevice());
  
  if (!isRealAndroidDevice()) {
    console.log('🔥 Pas Android détecté, skip');
    return;
  }
  
  try {
    console.log('🔥 FORCE demande permissions natives sur Android forcé');
    
    // Demander les permissions de manière séquentielle avec notre méthode forcée
    try {
      const cameraPerms = await forceCameraPermissions();
      console.log('📷 Permissions caméra FORCÉES:', cameraPerms);
    } catch (cameraError) {
      console.log('📷 Erreur caméra forcée:', cameraError);
    }
    
    try {
      const geoPerms = await forceGeolocationPermissions();
      console.log('📍 Permissions géolocalisation FORCÉES:', geoPerms);
    } catch (geoError) {
      console.log('📍 Erreur géolocalisation forcée:', geoError);
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur permissions FORCÉES:', error);
    return null;
  }
}

/** Ouvrir la galerie avec méthode FORCÉE */
export async function pickPhotoFromGallery() {
  try {
    console.log('🔥 FORCE galerie - Détection Android:', isRealAndroidDevice());
    
    if (isRealAndroidDevice()) {
      // Utiliser notre méthode forcée
      const photoPath = await forceOpenGallery();
      console.log('📷 Photo FORCÉE sélectionnée:', photoPath);
      return photoPath;
    } else {
      // Fallback web standard
      throw new Error('Galerie non disponible sur cette plateforme');
    }
  } catch (error) {
    console.error('❌ Erreur galerie FORCÉE:', error);
    throw error;
  }
}

/** Ouvrir les paramètres système pour autoriser la localisation */
export async function openLocationSettings() {
  try {
    if (Capacitor.isNativePlatform()) {
      // Sur Android/iOS, ouvrir les paramètres de l'app
      await Browser.open({ url: 'app-settings:' });
      console.log('⚙️ Ouverture des paramètres système');
    } else {
      // Sur web, afficher un message d'aide
      alert('Sur web, activez la géolocalisation dans les paramètres de votre navigateur (icône de localisation dans la barre d\'adresse)');
    }
  } catch (error) {
    console.error('❌ Impossible d\'ouvrir les paramètres:', error);
    // Fallback pour Android
    if (Capacitor.getPlatform() === 'android') {
      alert('Allez dans : Paramètres > Applications > RunConnect > Autorisations > Position > Autoriser');
    } else if (Capacitor.getPlatform() === 'ios') {
      alert('Allez dans : Réglages > Confidentialité et sécurité > Service de localisation > RunConnect > Autoriser');
    } else {
      alert('Veuillez autoriser la géolocalisation dans les paramètres de votre appareil');
    }
  }
}

/** Récupérer la position avec stratégie FORCÉE */
export async function getCurrentPositionSafe() {
  try {
    console.log('🔥 FORCE position - Détection Android:', isRealAndroidDevice());
    
    if (isRealAndroidDevice()) {
      // Utiliser notre méthode forcée
      const result = await forceGetPosition();
      console.log('📍 Position FORCÉE obtenue:', result);
      return {
        lat: result.lat,
        lng: result.lng,
        accuracy: result.accuracy
      };
    } else {
      throw new Error('Géolocalisation non disponible sur cette plateforme');
    }
  } catch (error) {
    console.error('❌ Erreur position FORCÉE:', error);
    throw error;
  }
}