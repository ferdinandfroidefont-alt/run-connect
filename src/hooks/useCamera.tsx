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

  const requestPermissions = async (): Promise<CameraPermissions> => {
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
      // FORCE Web input file partout - plus fiable que Capacitor
      console.log('🎯 FORCE galerie via input file web');
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