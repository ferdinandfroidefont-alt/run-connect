// src/lib/native.ts
import { Platform } from '@ionic/react'; // si tu n'as pas Ionic, tu peux enlever
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';

/** À lancer une fois au démarrage (ex: App.tsx useEffect) */
export async function requestNativePermissionsOnce() {
  try {
    // Demandes runtime (les entrées dans capacitor.config.ts ne suffisent pas)
    await Promise.allSettled([
      Camera.requestPermissions(),
      Geolocation.requestPermissions()
    ]);
  } catch (_) {
    // no-op
  }
}

/** Ouvrir la galerie de manière la plus compatible */
export async function pickPhotoFromGallery() {
  // Certains OEM buguent avec Prompt → on force Photos
  const photo = await Camera.getPhoto({
    source: CameraSource.Photos,
    resultType: CameraResultType.Uri, // plus fiable cross-devices
    quality: 85,
    correctOrientation: true,
    saveToGallery: false
  });
  // Retourne une URL exploitable (webPath) pour <img src=...> ou upload
  return photo.webPath ?? photo.path ?? null;
}

/** Récupérer la position avec timeouts/fallbacks propres */
export async function getCurrentPositionSafe() {
  // Demande (au cas où l’utilisateur a refusé au 1er lancement)
  await Geolocation.requestPermissions().catch(() => {});
  // Timeout long car certains GPS sont lents
  const pos = await Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0
  });
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy ?? null
  };
  import { useEffect } from 'react';
import { requestNativePermissionsOnce, pickPhotoFromGallery, getCurrentPositionSafe } from '@/lib/native';

useEffect(() => {
  requestNativePermissionsOnce(); // une fois au démarrage
}, []);

async function onPickPhoto() {
  const uri = await pickPhotoFromGallery();
  if (!uri) return;
  // … upload vers ton backend ou affiche dans <img src={uri} />
}

async function onLocate() {
  const p = await getCurrentPositionSafe();
  // … utilise p.lat / p.lng
}

}
