import { useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { CameraPermissions } from '@/types/permissions';
import { nativeManager } from '@/lib/nativeInit';
import { Device } from '@capacitor/device';
import { Capacitor } from '@capacitor/core';

export const useCamera = () => {
  const [loading, setLoading] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);

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
    console.log('📸 DÉBUT PRISE PHOTO ROBUSTE...');
    
    try {
      const isNative = await nativeManager.ensureNativeStatus();
      console.log('📸 Mode détecté:', isNative ? 'NATIF' : 'WEB');
      
      // STRATÉGIE 1: Essayer Capacitor en priorité
      console.log('🔄 Tentative Capacitor Camera...');
      try {
        const permissions = await Camera.requestPermissions();
        console.log('📱 Permissions Capacitor:', permissions);
        
        if (permissions.camera === 'granted') {
          const result = await Camera.getPhoto({
            quality: 85, // Qualité réduite pour éviter les timeouts
            allowEditing: false,
            resultType: CameraResultType.DataUrl,
            source: CameraSource.Camera
          });
          
          if (result.dataUrl) {
            const response = await fetch(result.dataUrl);
            const blob = await response.blob();
            const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
            console.log('✅ Photo via Capacitor:', file.size, 'bytes');
            return file;
          }
        }
      } catch (capacitorError) {
        console.log('❌ Capacitor Camera échoué:', capacitorError);
      }

      // STRATÉGIE 2: Fallback Input File Web
      console.log('🔄 Fallback Input File...');
      return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        
        const timeoutId = setTimeout(() => {
          resolve(null); // Ne pas rejeter, juste retourner null
        }, 30000); // Timeout plus court
        
        input.onchange = (event) => {
          clearTimeout(timeoutId);
          const file = (event.target as HTMLInputElement).files?.[0];
          console.log('✅ Fichier sélectionné:', file?.name);
          resolve(file || null);
        };
        
        input.oncancel = () => {
          clearTimeout(timeoutId);
          console.log('ℹ️ Sélection annulée');
          resolve(null);
        };
        
        input.click();
      });
      
    } catch (error) {
      console.error('📸❌ ERREUR PRISE PHOTO:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Détection intelligente de l'appareil
  const getDeviceStrategy = async () => {
    if (!deviceInfo) {
      try {
        const info = await Device.getInfo();
        setDeviceInfo(info);
        console.log('📱 Info appareil:', info);
        return info;
      } catch (error) {
        console.log('❌ Erreur info appareil:', error);
        return null;
      }
    }
    return deviceInfo;
  };

  const selectFromGallery = async (): Promise<File | null> => {
    setLoading(true);
    console.log('🖼️ DÉBUT SÉLECTION GALERIE INTELLIGENTE...');
    
    try {
      const isNative = await nativeManager.ensureNativeStatus();
      const device = await getDeviceStrategy();
      
      console.log('🖼️ Mode détecté:', isNative ? 'NATIF' : 'WEB');
      console.log('📱 Appareil:', device?.manufacturer, device?.model, 'Android', device?.osVersion);
      
      if (!isNative) {
        return await selectFromGalleryWeb();
      }
      
      // STRATÉGIE ANDROID 13+ : Plugin natif optimisé
      if (device?.osVersion && parseInt(device.osVersion) >= 13) {
        console.log('🚀 Android 13+ détecté - utilisation plugin optimisé');
        const result = await selectFromGalleryAndroid13();
        if (result) return result;
      }
      
      // STRATÉGIE MIUI : Plugin spécialisé
      if (device?.manufacturer?.toLowerCase().includes('xiaomi') || 
          device?.model?.toLowerCase().includes('redmi') ||
          device?.model?.toLowerCase().includes('poco')) {
        console.log('🔧 MIUI détecté - utilisation stratégie spécialisée');
        const result = await selectFromGalleryMIUI();
        if (result) return result;
      }
      
      // STRATÉGIE CAPACITOR : Standard Capacitor
      console.log('🔄 Utilisation Capacitor standard...');
      const result = await selectFromGalleryCapacitor();
      if (result) return result;
      
      // FALLBACK WEB
      console.log('🔄 Fallback web...');
      return await selectFromGalleryWeb();
      
    } catch (error) {
      console.error('🖼️❌ ERREUR SÉLECTION GALERIE:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Stratégie Android 13+ avec plugin natif
  const selectFromGalleryAndroid13 = async (): Promise<File | null> => {
    try {
      if ((window as any).Capacitor?.Plugins?.PermissionsPlugin) {
        const result = await (window as any).Capacitor.Plugins.PermissionsPlugin.forceOpenGallery();
        console.log('✅ Plugin Android 13+ résultat:', result);
        
        if (result.success && result.imageUri) {
          // Convertir l'URI en File
          return await convertUriToFile(result.imageUri, 'android13-gallery.jpg');
        }
      }
    } catch (error) {
      console.log('❌ Échec plugin Android 13+:', error);
    }
    return null;
  };

  // Stratégie MIUI spécialisée
  const selectFromGalleryMIUI = async (): Promise<File | null> => {
    try {
      if ((window as any).Capacitor?.Plugins?.PermissionsPlugin) {
        const result = await (window as any).Capacitor.Plugins.PermissionsPlugin.forceOpenGallery();
        console.log('✅ Plugin MIUI résultat:', result);
        
        if (result.success && result.imageUri) {
          return await convertUriToFile(result.imageUri, 'miui-gallery.jpg');
        }
      }
    } catch (error) {
      console.log('❌ Échec plugin MIUI:', error);
    }
    return null;
  };

  // Stratégie Capacitor standard
  const selectFromGalleryCapacitor = async (): Promise<File | null> => {
    try {
      const permissions = await Camera.requestPermissions();
      console.log('📱 Permissions Capacitor:', permissions);
      
      if (permissions.photos === 'granted') {
        const result = await Camera.getPhoto({
          quality: 85,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos
        });
        
        if (result.dataUrl) {
          const response = await fetch(result.dataUrl);
          const blob = await response.blob();
          const file = new File([blob], 'capacitor-gallery.jpg', { type: 'image/jpeg' });
          console.log('✅ Photo via Capacitor:', file.size, 'bytes');
          return file;
        }
      }
    } catch (error) {
      console.log('❌ Capacitor standard échoué:', error);
    }
    return null;
  };

  // Stratégie web
  const selectFromGalleryWeb = async (): Promise<File | null> => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      
      const timeoutId = setTimeout(() => {
        resolve(null);
      }, 30000);
      
      input.onchange = (event) => {
        clearTimeout(timeoutId);
        const file = (event.target as HTMLInputElement).files?.[0];
        console.log('✅ Fichier web sélectionné:', file?.name);
        resolve(file || null);
      };
      
      input.oncancel = () => {
        clearTimeout(timeoutId);
        console.log('ℹ️ Sélection web annulée');
        resolve(null);
      };
      
      input.click();
    });
  };

  // Convertir URI Android en File
  const convertUriToFile = async (uri: string, fileName: string): Promise<File | null> => {
    try {
      // Pour les URIs content:// d'Android, on ne peut pas les convertir directement
      // On retourne un objet File factice avec l'URI
      const response = await fetch(uri);
      const blob = await response.blob();
      return new File([blob], fileName, { type: 'image/jpeg' });
    } catch (error) {
      console.log('❌ Erreur conversion URI:', error);
      // Retourner un File factice avec l'URI comme nom
      const blob = new Blob([''], { type: 'image/jpeg' });
      const file = new File([blob], uri, { type: 'image/jpeg' });
      return file;
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