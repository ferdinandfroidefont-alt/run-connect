import { useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { CameraPermissions } from '@/types/permissions';
import { isReallyNative } from '@/lib/nativeDetection';

export const useCamera = () => {
  const [loading, setLoading] = useState(false);

  const checkPermissions = async (): Promise<CameraPermissions> => {
    try {
      const result = await Camera.checkPermissions();
      return {
        camera: result.camera,
        photos: result.photos
      };
    } catch (error) {
      console.log('Erreur check permissions caméra:', error);
      return { camera: 'prompt', photos: 'prompt' };
    }
  };

  const requestPermissions = async (): Promise<CameraPermissions> => {
    try {
      const result = await Camera.requestPermissions();
      return {
        camera: result.camera,
        photos: result.photos
      };
    } catch (error) {
      console.log('Erreur request permissions caméra:', error);
      return { camera: 'denied', photos: 'denied' };
    }
  };

  const takePicture = async (): Promise<File | null> => {
    setLoading(true);
    console.log('📸 DÉBUT PRISE PHOTO');
    
    const isNative = isReallyNative();
    console.log('📸 Mode natif détecté:', isNative);
    
    try {
      if (isNative) {
        console.log('📸 Utilisation caméra Capacitor');
        
        const permissions = await Camera.requestPermissions();
        console.log('📸 Permissions:', permissions);
        
        if (permissions.camera === 'granted') {
          const result = await Camera.getPhoto({
            quality: 90,
            allowEditing: false,
            resultType: CameraResultType.DataUrl,
            source: CameraSource.Camera
          });
          
          console.log('📸 ✅ Photo prise:', !!result.dataUrl);
          
          if (result.dataUrl) {
            const response = await fetch(result.dataUrl);
            const blob = await response.blob();
            const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
            return file;
          }
        }
      } else {
        console.log('📸 Utilisation input file web');
        
        return new Promise((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.capture = 'environment';
          
          input.onchange = (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            console.log('📸 ✅ Fichier sélectionné:', !!file);
            resolve(file || null);
          };
          
          input.oncancel = () => {
            console.log('📸 Annulé par utilisateur');
            resolve(null);
          };
          
          input.click();
        });
      }
    } catch (error) {
      console.error('📸 ❌ ERREUR:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const selectFromGallery = async (): Promise<File | null> => {
    setLoading(true);
    console.log('🖼️ DÉBUT SÉLECTION GALERIE');
    
    const isNative = isReallyNative();
    console.log('🖼️ Mode natif détecté:', isNative);
    
    try {
      if (isNative) {
        console.log('🖼️ Utilisation galerie Capacitor');
        
        const permissions = await Camera.requestPermissions();
        console.log('🖼️ Permissions:', permissions);
        
        if (permissions.photos === 'granted') {
          const result = await Camera.getPhoto({
            quality: 90,
            allowEditing: false,
            resultType: CameraResultType.DataUrl,
            source: CameraSource.Photos
          });
          
          console.log('🖼️ ✅ Image sélectionnée:', !!result.dataUrl);
          
          if (result.dataUrl) {
            const response = await fetch(result.dataUrl);
            const blob = await response.blob();
            const file = new File([blob], 'gallery-photo.jpg', { type: 'image/jpeg' });
            return file;
          }
        }
      } else {
        console.log('🖼️ Utilisation input file web');
        
        return new Promise((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          
          input.onchange = (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            console.log('🖼️ ✅ Fichier sélectionné:', !!file);
            resolve(file || null);
          };
          
          input.oncancel = () => {
            console.log('🖼️ Annulé par utilisateur');
            resolve(null);
          };
          
          input.click();
        });
      }
    } catch (error) {
      console.error('🖼️ ❌ ERREUR:', error);
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