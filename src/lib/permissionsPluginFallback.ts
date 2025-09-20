// Force le chargement du plugin PermissionsPlugin pour AAB
export const forcePermissionsPlugin = () => {
  console.log('🔥 FORCE PERMISSIONS PLUGIN LOADING...');
  
  // Vérifier si on est dans une app Capacitor Android
  const isCapacitorAndroid = (window as any).Capacitor && 
                            ((window as any).Capacitor.getPlatform() === 'android' || 
                             navigator.userAgent.includes('Android'));
  
  if (!isCapacitorAndroid) {
    console.log('🔥 Pas sur Android Capacitor, skip plugin');
    return false;
  }
  
  // Si le plugin n'existe pas, tenter de le créer
  if (!window.PermissionsPlugin) {
    console.log('🔥 CRÉATION PLUGIN FALLBACK...');
    
    // Créer un plugin fallback qui utilise les APIs Capacitor standard
    window.PermissionsPlugin = {
      async forceRequestLocationPermissions() {
        console.log('🔥 Plugin Fallback: Location permissions');
        try {
          const { Geolocation } = await import('@capacitor/geolocation');
          const result = await Geolocation.requestPermissions();
          console.log('🔥 Fallback Location result:', result);
          
          if (result.location === 'granted') {
            const position = await Geolocation.getCurrentPosition({
              enableHighAccuracy: false,
              timeout: 15000
            });
            console.log('🔥 Fallback Position obtained:', position.coords);
            return { 
              granted: true,
              device: { isMIUI: false, manufacturer: 'unknown' }
            };
          }
          return { granted: false };
        } catch (error) {
          console.error('Fallback location error:', error);
          return { granted: false };
        }
      },
      
      async forceRequestCameraPermissions() {
        console.log('🔥 Plugin Fallback: Camera permissions');
        try {
          const { Camera } = await import('@capacitor/camera');
          const result = await Camera.requestPermissions();
          return { 
            granted: result.camera === 'granted',
            device: { isMIUI: false, manufacturer: 'unknown' }
          };
        } catch (error) {
          console.error('Fallback camera error:', error);
          return { granted: false };
        }
      },
      
      async forceRequestContactsPermissions() {
        console.log('🔥 Plugin Fallback: Contacts permissions');
        try {
          // Note: Contacts plugin might not be available in AAB
          return { 
            granted: false,
            device: { isMIUI: false, manufacturer: 'unknown' }
          };
        } catch (error) {
          console.error('Fallback contacts error:', error);
          return { granted: false };
        }
      },
      
      async requestNotificationPermissions() {
        console.log('🔥 Plugin Fallback: Notification permissions');
        try {
          if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            return { 
              granted: permission === 'granted',
              device: { isMIUI: false, manufacturer: 'unknown' }
            };
          }
          return { granted: false };
        } catch (error) {
          console.error('Fallback notifications error:', error);
          return { granted: false };
        }
      },
      
      async getDeviceInfo() {
        console.log('🔥 Plugin Fallback: Device info');
        const userAgent = navigator.userAgent;
        const isMIUI = userAgent.includes('MIUI') || 
                      userAgent.includes('Xiaomi') || 
                      userAgent.includes('Redmi');
        
        return {
          device: {
            manufacturer: isMIUI ? 'Xiaomi' : 'unknown',
            isMIUI: isMIUI,
            version: 'unknown',
            model: 'unknown'
          }
        };
      },
      
      async openAppSettings() {
        console.log('🔥 Plugin Fallback: Open settings');
        try {
          // Tenter d'ouvrir les paramètres avec l'intent Android
          const url = 'intent://settings/APPLICATION_DETAILS_SETTINGS#Intent;scheme=package;package=app.lovable.91401b07-9cff-4f05-94e7-3eb42a9b7a7a;end';
          window.open(url, '_system');
          return { success: true };
        } catch (error) {
          console.error('Fallback settings error:', error);
          return { success: false };
        }
      },
      
      async showLocalNotification(options: any) {
        console.log('🔥 Plugin Fallback: Show notification');
        try {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(options.title, { body: options.body });
            return { success: true };
          }
          return { success: false };
        } catch (error) {
          return { success: false };
        }
      },
      
      async forceOpenGallery() {
        console.log('🔥 Plugin Fallback: Open gallery');
        try {
          const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
          const result = await Camera.getPhoto({
            source: CameraSource.Photos,
            resultType: CameraResultType.Uri,
            quality: 90
          });
          console.log('🔥 Fallback Gallery result:', result);
          return { 
            success: true, 
            method: 'fallback-capacitor',
            imageUrl: result.webPath || result.path
          };
        } catch (error) {
          console.error('Fallback gallery error:', error);
          return { success: false, method: 'fallback' };
        }
      }
    };
    
    console.log('✅ PLUGIN FALLBACK CRÉÉ');
    return true;
  }
  
  console.log('✅ Plugin déjà disponible');
  return true;
};

// Auto-init
export const initPermissionsPluginFix = () => {
  setTimeout(() => {
    forcePermissionsPlugin();
  }, 100); // Délai réduit pour initialisation plus rapide
};