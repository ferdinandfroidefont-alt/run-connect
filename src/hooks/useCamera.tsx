import { useState, useCallback } from 'react';
import { PermissionState } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource, CameraDirection, CameraPermissionState } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { CameraPermissions } from '@/types/permissions';

export const useCamera = () => {
  const [loading, setLoading] = useState(false);

  const checkPermissions = async (): Promise<CameraPermissions> => {
    if (Capacitor.isNativePlatform()) {
      try {
        const permissions = await Camera.checkPermissions();
        console.log('🔍 Camera permissions:', permissions);
        return permissions;
      } catch (error) {
        console.error('❌ Error checking camera permissions:', error);
        return { camera: 'denied' as CameraPermissionState, photos: 'denied' as CameraPermissionState };
      }
    }
    return { camera: 'granted' as CameraPermissionState, photos: 'granted' as CameraPermissionState };
  };

  const waitForPlugin = async (maxWait = 3000): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).PermissionsPlugin) {
        resolve(true);
        return;
      }
      
      let waited = 0;
      const checkInterval = setInterval(() => {
        if ((window as any).PermissionsPlugin) {
          clearInterval(checkInterval);
          resolve(true);
        } else if (waited >= maxWait) {
          clearInterval(checkInterval);
          resolve(false);
        }
        waited += 100;
      }, 100);
    });
  };

  const requestPermissions = async (): Promise<CameraPermissions> => {
    console.log('🔍 requestPermissions - attente du plugin camera...');
    
    // Attendre que le plugin soit disponible
    const pluginReady = await waitForPlugin();
    
    if (pluginReady && (window as any).PermissionsPlugin) {
      try {
        console.log('🔍 Utilisation PermissionsPlugin.forceRequestCameraPermissions');
        const result = await (window as any).PermissionsPlugin.forceRequestCameraPermissions();
        console.log('🔍 Plugin camera result:', result);
        
        if (result && result.granted) {
          return { camera: 'granted' as CameraPermissionState, photos: 'granted' as CameraPermissionState };
        }
      } catch (error) {
        console.log('🔍 Plugin camera échoué, fallback vers Capacitor:', error);
      }
    } else {
      console.log('🔍 Plugin camera non disponible après attente, fallback Capacitor');
    }
    
    // Fallback vers Capacitor standard
    if (Capacitor.isNativePlatform()) {
      try {
        const permissions = await Camera.requestPermissions({
          permissions: ['camera', 'photos']
        });
        console.log('🔍 Requested camera permissions:', permissions);
        return permissions;
      } catch (error) {
        console.error('❌ Error requesting camera permissions:', error);
        return { camera: 'denied' as CameraPermissionState, photos: 'denied' as CameraPermissionState };
      }
    }
    return { camera: 'granted' as CameraPermissionState, photos: 'granted' as CameraPermissionState };
  };

  const takePicture = useCallback(async (): Promise<File | null> => {
    setLoading(true);
    
    try {
      if (Capacitor.isNativePlatform()) {
        // Check and request permissions first
        let permissions = await checkPermissions();
        if (permissions.camera !== 'granted' || permissions.photos !== 'granted') {
          permissions = await requestPermissions();
          if (permissions.camera !== 'granted' || permissions.photos !== 'granted') {
            throw new Error('Permissions refusées');
          }
        }

        // Use Capacitor Camera on native platforms
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Uri,
          source: CameraSource.Camera,
          direction: CameraDirection.Rear,
          correctOrientation: true,
          saveToGallery: false
        });

        if (image.webPath) {
          const response = await fetch(image.webPath);
          const blob = await response.blob();
          const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
          return file;
        }
        return null;
      } else {
        // Fallback to file input for browsers
        return new Promise((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.capture = 'environment';
          
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            resolve(file || null);
          };
          
          input.click();
        });
      }
    } catch (error) {
      console.error('Camera error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const selectFromGallery = useCallback(async (): Promise<File | null> => {
    setLoading(true);
    
    try {
      // Attendre et utiliser le plugin de fallback pour la galerie
      console.log('🎯 Attente du plugin pour galerie...');
      const pluginReady = await waitForPlugin();
      
      if (pluginReady && (window as any).PermissionsPlugin) {
        console.log('🎯 Utilisation PermissionsPlugin.forceOpenGallery');
        try {
          const result = await (window as any).PermissionsPlugin.forceOpenGallery();
          console.log('🎯 Plugin gallery result:', result);
          
          if (result && result.success && result.imageUrl) {
            // Convertir l'URL en File
            const response = await fetch(result.imageUrl);
            const blob = await response.blob();
            const file = new File([blob], 'gallery-image.jpg', { type: 'image/jpeg' });
            console.log('📸 Image obtenue via plugin:', file.name);
            return file;
          }
        } catch (pluginError) {
          console.log('🎯 Plugin gallery échoué, fallback vers input file:', pluginError);
        }
      } else {
        console.log('🎯 Plugin gallery non disponible après attente, fallback input file');
      }
      
      // Fallback vers input file web
      console.log('🎯 Fallback vers input file web');
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          console.log('📸 Image sélectionnée via input file:', file?.name);
          resolve(file || null);
        };
        
        input.click();
      });
    } catch (error) {
      console.error('❌ Gallery error:', error);
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