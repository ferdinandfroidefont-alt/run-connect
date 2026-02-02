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
        if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
          // Essayer d'obtenir plus d'infos via le plugin natif
          try {
            const nativeInfo = await (window as any).Capacitor?.Plugins?.PermissionsPlugin?.getDeviceInfo?.();
            if (nativeInfo) {
              setDeviceInfo(nativeInfo);
              return nativeInfo;
            }
          } catch (error) {
            console.log('❌ Plugin natif non disponible, utilisation Device API');
          }
        }
        
        // Fallback vers Device API standard
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
    console.log('🖼️ DÉBUT SÉLECTION GALERIE...');
    
    try {
      // Détecter si on est dans une WebView native Android
      const isAndroidWebView = 
        /Android.*WebView/.test(navigator.userAgent) || 
        /wv/.test(navigator.userAgent) ||
        (window as any).AndroidBridge !== undefined ||
        document.URL.startsWith('file://');

      console.log('🔍 Détection WebView:', {
        userAgent: navigator.userAgent.substring(0, 100),
        isWebView: isAndroidWebView,
        hasAndroidBridge: !!(window as any).AndroidBridge
      });
      
      // 🔥 STRATÉGIE UNIFIÉE : Toujours utiliser l'input file HTML
      // Car c'est la seule méthode qui fonctionne de manière fiable sur Android WebView
      // L'événement onShowFileChooser dans MainActivity.java gère l'ouverture de la galerie
      console.log('📱 Utilisation input file HTML (compatible WebView Android)');
      return await selectFromGalleryWeb();
      
    } catch (error: any) {
      console.error('🖼️❌ ERREUR:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Note: Manufacturer strategy detection kept for potential future use
  // but simplified approach uses HTML input file for all Android WebViews

  // Stratégie par version Android
  const selectFromGalleryVersionSpecific = async (version: string, strategy?: string): Promise<File | null> => {
    try {
      if ((window as any).Capacitor?.Plugins?.PermissionsPlugin) {
        const result = await (window as any).Capacitor.Plugins.PermissionsPlugin.forceOpenGallery();
        console.log(`✅ Plugin ${version}${strategy ? '-' + strategy : ''} résultat:`, result);
        
        if (result.success && result.imageUri) {
          const fileName = `${version}${strategy ? '-' + strategy : ''}-gallery.jpg`;
          return await convertUriToFile(result.imageUri, fileName);
        }
      }
    } catch (error) {
      console.log(`❌ Échec plugin ${version}${strategy ? '-' + strategy : ''}:`, error);
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

  // Stratégie web améliorée pour WebView Android
  const selectFromGalleryWeb = async (): Promise<File | null> => {
    return new Promise((resolve) => {
      console.log('🌐 [GALLERY-WEB] Ouverture input file web...');
      
      // Supprimer tout input résiduel
      const existingInputs = document.querySelectorAll('input[type="file"][data-gallery-picker]');
      existingInputs.forEach(el => el.remove());
      
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.setAttribute('data-gallery-picker', 'true');
      
      // Style pour rendre l'input visible sur Android WebView (requis pour certains appareils)
      input.style.position = 'fixed';
      input.style.top = '0';
      input.style.left = '0';
      input.style.opacity = '0.01';
      input.style.width = '1px';
      input.style.height = '1px';
      input.style.zIndex = '999999';
      
      // Ajouter au DOM AVANT de cliquer (requis pour Android WebView)
      document.body.appendChild(input);
      
      let resolved = false;
      let focusHandled = false;
      
      const doResolve = (file: File | null, source: string) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutId);
        console.log(`🌐 [GALLERY-WEB] Résolution via ${source}:`, file ? file.name : 'null');
        
        // Nettoyer l'input après un court délai
        setTimeout(() => {
          try { input.remove(); } catch (e) { /* ignore */ }
        }, 200);
        
        resolve(file);
      };
      
      // Timeout de 90 secondes (augmenté pour les appareils lents)
      const timeoutId = setTimeout(() => {
        console.warn('⏱️ [GALLERY-WEB] Timeout sélection galerie (90s)');
        doResolve(null, 'timeout');
      }, 90000);
      
      // 🔥 IMPORTANT: L'événement onchange est prioritaire
      input.onchange = (event) => {
        console.log('🔄 [GALLERY-WEB] onchange déclenché');
        const file = (event.target as HTMLInputElement).files?.[0];
        
        if (file) {
          console.log('✅ [GALLERY-WEB] Fichier sélectionné:', {
            name: file.name,
            size: file.size,
            type: file.type
          });
          doResolve(file, 'onchange');
        } else {
          console.warn('⚠️ [GALLERY-WEB] onchange sans fichier');
          doResolve(null, 'onchange-empty');
        }
      };
      
      // Détecter annulation via focus/visibilitychange (Android WebView)
      // 🔥 DÉLAI AUGMENTÉ À 3 SECONDES pour les appareils lents
      const handleVisibilityOrFocus = () => {
        if (focusHandled || resolved) return;
        focusHandled = true;
        
        console.log('🔄 [GALLERY-WEB] App revenue au premier plan, attente onchange...');
        
        // Attendre 3 secondes pour laisser le temps à onchange de se déclencher
        setTimeout(() => {
          if (resolved) {
            console.log('🔄 [GALLERY-WEB] Déjà résolu pendant l\'attente');
            return;
          }
          
          // Vérifier une dernière fois si un fichier a été sélectionné
          if (input.files && input.files.length > 0) {
            console.log('✅ [GALLERY-WEB] Fichier trouvé après focus:', input.files[0].name);
            doResolve(input.files[0], 'focus-check');
          } else {
            console.log('ℹ️ [GALLERY-WEB] Sélection annulée (pas de fichier après 3s)');
            doResolve(null, 'focus-cancel');
          }
        }, 3000); // 3 secondes au lieu de 500ms
      };
      
      // Écouter les deux événements pour détecter le retour de l'app
      window.addEventListener('focus', handleVisibilityOrFocus, { once: true });
      
      const visibilityHandler = () => {
        if (document.visibilityState === 'visible') {
          handleVisibilityOrFocus();
          document.removeEventListener('visibilitychange', visibilityHandler);
        }
      };
      document.addEventListener('visibilitychange', visibilityHandler);
      
      input.onerror = (error) => {
        console.error('❌ [GALLERY-WEB] Erreur input file:', error);
        doResolve(null, 'error');
      };
      
      // Délai avant click pour Android WebView
      setTimeout(() => {
        try {
          input.click();
          console.log('✅ [GALLERY-WEB] Input file cliqué');
        } catch (clickError) {
          console.error('❌ [GALLERY-WEB] Erreur click input:', clickError);
          doResolve(null, 'click-error');
        }
      }, 150);
    });
  };

  // Convertir URI Android en File
  const convertUriToFile = async (uri: string, fileName: string): Promise<File | null> => {
    try {
      console.log('🔄 Conversion URI vers File:', uri);
      
      // Pour les URIs content:// d'Android
      const response = await fetch(uri);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const blob = await response.blob();
      
      // Vérifier que le blob n'est pas vide
      if (blob.size === 0) {
        throw new Error('Blob vide');
      }
      
      const file = new File([blob], fileName, { type: 'image/jpeg' });
      console.log('✅ URI converti:', {
        name: file.name,
        size: file.size
      });
      
      return file;
    } catch (error) {
      console.error('❌ Erreur conversion URI:', error);
      // Ne plus retourner de File factice vide, retourner null
      return null;
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