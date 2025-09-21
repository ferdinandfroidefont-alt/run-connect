import { useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { CameraPermissions } from '@/types/permissions';
import { nativeManager } from '@/lib/nativeInit';

export const useCamera = () => {
  const [loading, setLoading] = useState(false);

  const checkPermissions = async (): Promise<CameraPermissions> => {
    try {
      const isNative = await nativeManager.ensureNativeStatus();
      
      if (isNative) {
        const result = await Camera.checkPermissions();
        return {
          camera: result.camera,
          photos: result.photos
        };
      } else {
        // Mode web - simuler permissions
        return { camera: 'prompt', photos: 'prompt' };
      }
    } catch (error) {
      console.log('❌ Erreur check permissions caméra:', error);
      return { camera: 'prompt', photos: 'prompt' };
    }
  };

  const requestPermissions = async (): Promise<CameraPermissions> => {
    try {
      const isNative = await nativeManager.ensureNativeStatus();
      
      if (isNative) {
        const result = await Camera.requestPermissions();
        return {
          camera: result.camera,
          photos: result.photos
        };
      } else {
        // Mode web - simuler granted
        return { camera: 'granted', photos: 'granted' };
      }
    } catch (error) {
      console.log('❌ Erreur request permissions caméra:', error);
      return { camera: 'denied', photos: 'denied' };
    }
  };

  const takePicture = async (): Promise<File | null> => {
    setLoading(true);
    console.log('📸 DÉBUT PRISE PHOTO...');
    
    try {
      // Attendre confirmation du statut natif
      const isNative = await nativeManager.ensureNativeStatus();
      console.log('📸 Mode confirmé:', isNative ? 'NATIF' : 'WEB');
      
      if (isNative) {
        // ===== MODE NATIF - CAPACITOR =====
        console.log('📱 Utilisation Capacitor Camera');
        
        try {
          // Demander permissions
          const permissions = await Camera.requestPermissions();
          console.log('📱 Permissions caméra:', permissions);
          
          if (permissions.camera !== 'granted') {
            throw new Error('Permission caméra refusée');
          }
          
          // Prendre photo
          const result = await Camera.getPhoto({
            quality: 90,
            allowEditing: false,
            resultType: CameraResultType.DataUrl,
            source: CameraSource.Camera
          });
          
          console.log('📱 Photo prise:', !!result.dataUrl);
          
          if (result.dataUrl) {
            const response = await fetch(result.dataUrl);
            const blob = await response.blob();
            const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
            console.log('📱✅ Photo convertie en File:', file.size, 'bytes');
            return file;
          }
          
          throw new Error('Pas de données photo reçues');
          
        } catch (capacitorError) {
          console.error('📱❌ Erreur Capacitor Camera:', capacitorError);
          throw capacitorError;
        }
        
      } else {
        // ===== MODE WEB - INPUT FILE =====
        console.log('🌐 Utilisation input file avec capture');
        
        return new Promise((resolve, reject) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.capture = 'environment'; // Caméra arrière
          
          const timeoutId = setTimeout(() => {
            reject(new Error('Timeout sélection photo'));
          }, 60000); // 1 minute
          
          input.onchange = (event) => {
            clearTimeout(timeoutId);
            const file = (event.target as HTMLInputElement).files?.[0];
            console.log('🌐✅ Fichier sélectionné:', file?.name, file?.size, 'bytes');
            resolve(file || null);
          };
          
          input.oncancel = () => {
            clearTimeout(timeoutId);
            console.log('🌐 Sélection annulée par utilisateur');
            resolve(null);
          };
          
          // Déclencher sélection
          input.click();
        });
      }
      
    } catch (error) {
      console.error('📸❌ ERREUR PRISE PHOTO:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const selectFromGallery = async (): Promise<File | null> => {
    setLoading(true);
    console.log('🖼️ DÉBUT SÉLECTION GALERIE...');
    
    try {
      // Attendre confirmation du statut natif
      const isNative = await nativeManager.ensureNativeStatus();
      console.log('🖼️ Mode confirmé:', isNative ? 'NATIF' : 'WEB');
      
      if (isNative) {
        // ===== MODE NATIF - CAPACITOR =====
        console.log('📱 Utilisation Capacitor Photos');
        
        try {
          // Demander permissions
          const permissions = await Camera.requestPermissions();
          console.log('📱 Permissions photos:', permissions);
          
          if (permissions.photos !== 'granted') {
            throw new Error('Permission photos refusée');
          }
          
          // Sélectionner photo
          const result = await Camera.getPhoto({
            quality: 90,
            allowEditing: false,
            resultType: CameraResultType.DataUrl,
            source: CameraSource.Photos
          });
          
          console.log('📱 Photo sélectionnée:', !!result.dataUrl);
          
          if (result.dataUrl) {
            const response = await fetch(result.dataUrl);
            const blob = await response.blob();
            const file = new File([blob], 'gallery-photo.jpg', { type: 'image/jpeg' });
            console.log('📱✅ Photo convertie en File:', file.size, 'bytes');
            return file;
          }
          
          throw new Error('Pas de données photo reçues');
          
        } catch (capacitorError) {
          console.error('📱❌ Erreur Capacitor Photos:', capacitorError);
          throw capacitorError;
        }
        
      } else {
        // ===== MODE WEB - INPUT FILE =====
        console.log('🌐 Utilisation input file standard');
        
        return new Promise((resolve, reject) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          
          const timeoutId = setTimeout(() => {
            reject(new Error('Timeout sélection galerie'));
          }, 60000); // 1 minute
          
          input.onchange = (event) => {
            clearTimeout(timeoutId);
            const file = (event.target as HTMLInputElement).files?.[0];
            console.log('🌐✅ Fichier sélectionné:', file?.name, file?.size, 'bytes');
            resolve(file || null);
          };
          
          input.oncancel = () => {
            clearTimeout(timeoutId);
            console.log('🌐 Sélection annulée par utilisateur');
            resolve(null);
          };
          
          // Déclencher sélection
          input.click();
        });
      }
      
    } catch (error) {
      console.error('🖼️❌ ERREUR SÉLECTION GALERIE:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    takePicture,
    selectFromGallery,
    checkPermissions,
    requestPermissions
  };
};