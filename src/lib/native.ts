import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

/** Initialiser les permissions natives au démarrage */
export async function requestNativePermissionsOnce() {
  if (!Capacitor.isNativePlatform()) return;
  
  try {
    console.log('🔧 Demande permissions natives...');
    
    // Demander les permissions de manière séquentielle pour éviter les conflits
    const cameraPerms = await Camera.requestPermissions();
    console.log('📷 Permissions caméra:', cameraPerms);
    
    const geoPerms = await Geolocation.requestPermissions();
    console.log('📍 Permissions géolocalisation:', geoPerms);
    
    return { camera: cameraPerms, geolocation: geoPerms };
  } catch (error) {
    console.error('❌ Erreur permissions:', error);
    return null;
  }
}

/** Ouvrir la galerie avec gestion d'erreur robuste */
export async function pickPhotoFromGallery() {
  try {
    // Forcer l'utilisation de la galerie pour éviter les bugs OEM
    const photo = await Camera.getPhoto({
      source: CameraSource.Photos,
      resultType: CameraResultType.Uri,
      quality: 90,
      correctOrientation: true,
      saveToGallery: false,
      allowEditing: false
    });
    
    console.log('📷 Photo sélectionnée:', photo);
    return photo.webPath || photo.path;
  } catch (error) {
    console.error('❌ Erreur galerie:', error);
    throw error;
  }
}

/** Récupérer la position avec stratégie multi-tentatives */
export async function getCurrentPositionSafe() {
  try {
    console.log('📍 Tentative géolocalisation...');
    
    // Stratégie 1: Position rapide peu précise (compatible vieux téléphones)
    try {
      const quickPos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000 // 5 minutes
      });
      console.log('📍 Position rapide obtenue:', quickPos);
      return {
        lat: quickPos.coords.latitude,
        lng: quickPos.coords.longitude,
        accuracy: quickPos.coords.accuracy
      };
    } catch (quickError) {
      console.log('⚠️ Position rapide échouée, tentative précise...');
    }
    
    // Stratégie 2: Position précise avec timeout plus long
    const precisePos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0
    });
    
    console.log('📍 Position précise obtenue:', precisePos);
    return {
      lat: precisePos.coords.latitude,
      lng: precisePos.coords.longitude,
      accuracy: precisePos.coords.accuracy
    };
  } catch (error) {
    console.error('❌ Toutes les tentatives géolocalisation échouées:', error);
    throw error;
  }
}