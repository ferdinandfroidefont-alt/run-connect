import { useState, useCallback } from 'react';
import { PermissionState } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource, CameraDirection, CameraPermissionState } from '@capacitor/camera';
import { detectNativeAndroid } from '@/lib/detectNativeAndroid';
import { CameraPermissions } from '@/types/permissions';

export const useCamera = () => {
  const [loading, setLoading] = useState(false);

  const checkPermissions = async (): Promise<CameraPermissions> => {
    try {
      if (detectNativeAndroid()) {
        const permissions = await Camera.checkPermissions();
        console.log('🔍 Camera permissions:', permissions);
        return permissions;
      }
    } catch (error) {
      console.error('❌ Error checking camera permissions:', error);
    }
    return { camera: 'granted' as CameraPermissionState, photos: 'granted' as CameraPermissionState };
  };

  const requestPermissions = async (): Promise<CameraPermissions> => {
    try {
      if (detectNativeAndroid()) {
        const permissions = await Camera.requestPermissions({
          permissions: ['camera', 'photos']
        });
        return permissions;
      }
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
    }
    return { camera: 'granted' as CameraPermissionState, photos: 'granted' as CameraPermissionState };
  };

  const takePicture = useCallback(async (): Promise<File | null> => {
    setLoading(true);
    
    try {
      // Vérifier le mode Force Android
      const forceAndroid = !!(window as any).ForceAndroidMode || new URLSearchParams(window.location.search).has('forceAndroid');
      const isNativeDetected = detectNativeAndroid();
      
      console.log('📷📷📷 CAMERA - Mode de fonctionnement:');
      console.log('📷 Force Android:', forceAndroid);
      console.log('📷 Native détecté:', isNativeDetected);
      console.log('📷 Capacitor disponible:', !!(window as any).Capacitor);
      
      // Essayer Capacitor sur Android natif OU forcé
      if (isNativeDetected || forceAndroid) {
        console.log('📷 ✅ Tentative prise photo Capacitor (natif ou forcé)...');
        try {
          // Vérifier et demander les permissions
          const permissions = await Camera.requestPermissions();
          console.log('📷 Permissions camera:', permissions);
          
          if (permissions.camera !== 'granted') {
            console.log('❌ Permissions camera refusées');
            throw new Error('Permissions camera refusées');
          }

          const image = await Camera.getPhoto({
            quality: 90,
            allowEditing: false,
            resultType: CameraResultType.Uri,
            source: CameraSource.Camera,
            direction: CameraDirection.Rear,
            correctOrientation: true,
            saveToGallery: false
          });
          console.log('📷 Photo prise via Capacitor:', image);

          if (image.webPath) {
            const response = await fetch(image.webPath);
            const blob = await response.blob();
            const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
            console.log('📷 ✅ Photo Capacitor traitée avec succès');
            return file;
          }
        } catch (capacitorError) {
          console.log('❌ Erreur Capacitor camera:', capacitorError);
        }
      } else {
        console.log('🌐 Web détecté pour la camera');
      }
      
      // Fallback to file input for browsers
      console.log('📷 🔄 Fallback vers input file pour la caméra');
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          console.log('📷 Fichier sélectionné via fallback:', file);
          resolve(file || null);
        };
        
        input.oncancel = () => {
          console.log('📷 Sélection annulée');
          resolve(null);
        };
        
        input.click();
      });
    } catch (error) {
      console.error('📷 ❌ Camera error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const selectFromGallery = useCallback(async (): Promise<File | null> => {
    setLoading(true);
    
    try {
      // Vérifier le mode Force Android
      const forceAndroid = !!(window as any).ForceAndroidMode || new URLSearchParams(window.location.search).has('forceAndroid');
      const isNativeDetected = detectNativeAndroid();
      
      console.log('🖼️🖼️🖼️ GALLERY - Mode de fonctionnement:');
      console.log('🖼️ Force Android:', forceAndroid);
      console.log('🖼️ Native détecté:', isNativeDetected);
      console.log('🖼️ Capacitor disponible:', !!(window as any).Capacitor);
      
      // Essayer Capacitor sur Android natif OU forcé
      if (isNativeDetected || forceAndroid) {
        console.log('🖼️ ✅ Tentative sélection galerie Capacitor (natif ou forcé)...');
        try {
          // Vérifier et demander les permissions
          const permissions = await Camera.requestPermissions();
          console.log('🖼️ Permissions galerie:', permissions);
          
          if (permissions.photos !== 'granted') {
            console.log('❌ Permissions galerie refusées');
            throw new Error('Permissions galerie refusées');
          }

          const image = await Camera.getPhoto({
            resultType: CameraResultType.Uri,
            source: CameraSource.Photos,
            quality: 90
          });
          console.log('🖼️ Image sélectionnée via Capacitor:', image);

          if (image.webPath) {
            const response = await fetch(image.webPath);
            const blob = await response.blob();
            const file = new File([blob], 'gallery-image.jpg', { type: blob.type || 'image/jpeg' });
            console.log('🖼️ ✅ Image galerie Capacitor traitée avec succès');
            return file;
          }
        } catch (capacitorError) {
          console.log('❌ Erreur Capacitor galerie:', capacitorError);
        }
      } else {
        console.log('🌐 Web détecté pour la galerie');
      }
      
      // Fallback web
      console.log('🖼️ 🔄 Fallback vers input file pour la galerie');
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          console.log('🖼️ Fichier sélectionné via fallback:', file);
          resolve(file || null);
        };
        
        input.oncancel = () => {
          console.log('🖼️ Sélection annulée');
          resolve(null);
        };
        
        input.click();
      });
    } catch (error) {
      console.error('🖼️ ❌ Gallery error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    takePicture,
    selectFromGallery,
    checkPermissions,
    requestPermissions
  };
};