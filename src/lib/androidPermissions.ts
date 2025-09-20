import { Capacitor } from '@capacitor/core';

declare global {
  interface Window {
    PermissionsPlugin: {
      forceRequestLocationPermissions(): Promise<{ granted: boolean; device?: any }>;
      forceRequestLocationPermissionsAndroid10(): Promise<{ granted: boolean; device?: any; method?: string }>;
      forceRequestCameraPermissions(): Promise<{ granted: boolean; device?: any }>;
      forceRequestContactsPermissions(): Promise<{ granted: boolean; device?: any }>;
      requestNotificationPermissions(): Promise<{ granted: boolean; device?: any; needsSettings?: boolean; advice?: string }>;
      showLocalNotification(options: { title: string; body: string; icon?: string }): Promise<{ success: boolean; device?: any }>;
      openAppSettings(): Promise<{ success: boolean; device?: any }>;
      getDeviceInfo(): Promise<{ device: any }>;
      forceOpenGallery(): Promise<{ 
        success: boolean; 
        method?: string; 
        device?: any;
        imageUri?: string;
        imagePath?: string;
      }>;
    };
  }
}

export const androidPermissions = {
  // FIX AAB: Détection Android ULTRA robuste pour Play Store AAB
  isAndroid: () => {
    const platform = Capacitor.getPlatform();
    const userAgent = navigator.userAgent.toLowerCase();
    const hasCapacitor = !!(window as any).Capacitor;
    const isDesktop = userAgent.includes('windows') || userAgent.includes('macintosh') || userAgent.includes('linux');
    
    // 1. Si Capacitor détecte Android, c'est bon
    if (platform === 'android') {
      return true;
    }
    
    // 2. FORCE Android si on a Capacitor mais pas sur desktop
    if (hasCapacitor && !isDesktop) {
      return true;
    }
    
    // 3. Si Capacitor dit "web" mais UserAgent Android
    if (platform === 'web' && userAgent.includes('android') && hasCapacitor) {
      return true;
    }
    
    return false;
  },

  async getDeviceInfo() {
    if (!this.isAndroid() || !window.PermissionsPlugin) {
      return null;
    }
    
    try {
      const result = await window.PermissionsPlugin.getDeviceInfo();
      return result.device;
    } catch (error) {
      console.error('🔥 Erreur info périphérique:', error);
      return null;
    }
  },

  async forceRequestLocationPermissions(): Promise<boolean> {
    if (!this.isAndroid() || !window.PermissionsPlugin) {
      return false;
    }
    
    try {
      console.log('🔥 Demande FORCÉE permissions géolocalisation Android');
      const result = await window.PermissionsPlugin.forceRequestLocationPermissions();
      console.log('🔥 Résultat permissions géolocalisation:', result);
      
      // Vérifier si c'est un appareil MIUI/Xiaomi
      if (result.device?.isMIUI && !result.granted) {
        console.log('🔥 Appareil MIUI détecté - conseils spéciaux');
        console.log('📱 Modèle:', result.device.manufacturer, result.device.model);
        console.log('⚙️ Android:', result.device.version, 'API:', result.device.sdkInt);
        
        // Android 10+ nécessite des instructions spéciales
        if (result.device.sdkInt >= 29) {
          console.log('🔥 Android 10+ MIUI - permissions arrière-plan requises');
        }
      }
      
      return result.granted;
    } catch (error) {
      console.error('🔥 Erreur permissions géolocalisation:', error);
      return false;
    }
  },

  async forceRequestLocationPermissionsAndroid10(): Promise<boolean> {
    if (!this.isAndroid() || !window.PermissionsPlugin) {
      console.log('❌ Android non détecté ou PermissionsPlugin non disponible pour Android 10+');
      return false;
    }

    // Détecter Android 10+ depuis User Agent
    const androidVersion = navigator.userAgent.match(/Android (\d+)/)?.[1];
    const isAndroid10Plus = androidVersion && parseInt(androidVersion) >= 10;
    
    console.log('📱 Android version détectée:', androidVersion);
    console.log('📱 Android 10+ requis:', isAndroid10Plus);

    try {
      if (isAndroid10Plus && window.PermissionsPlugin.forceRequestLocationPermissionsAndroid10) {
        console.log('🔄 Utilisation méthode Android 10+ spécialisée...');
        const result = await window.PermissionsPlugin.forceRequestLocationPermissionsAndroid10();
        console.log('✅ Permissions Android 10+ obtenues:', result);
        
        // Logs spéciaux pour Android 10+
        if (result.device?.sdkInt >= 29) {
          console.log('📱 ACCESS_BACKGROUND_LOCATION demandée pour Android', result.device.sdkInt);
        }
        
        return result?.granted || false;
      } else {
        // Fallback vers méthode normale
        console.log('🔄 Fallback vers méthode normale...');
        return await this.forceRequestLocationPermissions();
      }
    } catch (error) {
      console.error('❌ Erreur permissions Android 10+:', error);
      // Fallback vers méthode normale en cas d'erreur
      return await this.forceRequestLocationPermissions();
    }
  },

  async forceRequestCameraPermissions(): Promise<boolean> {
    if (!this.isAndroid() || !window.PermissionsPlugin) {
      return false;
    }
    
    try {
      console.log('🔥 Demande FORCÉE permissions caméra Android');
      const result = await window.PermissionsPlugin.forceRequestCameraPermissions();
      console.log('🔥 Résultat permissions caméra:', result);
      
      if (result.device?.isMIUI && !result.granted) {
        console.log('🔥 Appareil MIUI - permissions caméra nécessitent configuration manuelle');
      }
      
      return result.granted;
    } catch (error) {
      console.error('🔥 Erreur permissions caméra:', error);
      return false;
    }
  },

  async forceRequestContactsPermissions(): Promise<boolean> {
    if (!this.isAndroid() || !window.PermissionsPlugin) {
      return false;
    }
    
    try {
      console.log('🔥 Demande FORCÉE permissions contacts Android');
      const result = await window.PermissionsPlugin.forceRequestContactsPermissions();
      console.log('🔥 Résultat permissions contacts:', result);
      return result.granted;
    } catch (error) {
      console.error('🔥 Erreur permissions contacts:', error);
      return false;
    }
  },

  async forceOpenGallery(): Promise<{ success: boolean; method?: string; imageUri?: string; imagePath?: string }> {
    if (!this.isAndroid() || !window.PermissionsPlugin) {
      return { success: false };
    }
    
    try {
      console.log('🔥 Ouverture FORCÉE galerie Android');
      const result = await window.PermissionsPlugin.forceOpenGallery();
      console.log('🔥 Résultat ouverture galerie:', result);
      
      if (result.device?.isMIUI) {
        console.log('🔥 Galerie MIUI ouverte avec méthode:', result.method);
      }
      
      if (result.success && result.imageUri) {
        console.log('🔥 Image sélectionnée:', result.imageUri);
      }
      
      return { 
        success: result.success, 
        method: result.method,
        imageUri: result.imageUri,
        imagePath: result.imagePath
      };
    } catch (error) {
      console.error('🔥 Erreur ouverture galerie:', error);
      return { success: false };
    }
  },

  async requestNotificationPermissions(): Promise<{ granted: boolean; needsSettings?: boolean; advice?: string }> {
    if (!this.isAndroid() || !window.PermissionsPlugin) {
      return { granted: false };
    }
    
    try {
      console.log('🔥 Demande FORCÉE permissions notifications Android');
      const result = await window.PermissionsPlugin.requestNotificationPermissions();
      console.log('🔥 Résultat permissions notifications:', result);
      
      if (result.device?.isMIUI && !result.granted) {
        console.log('🔥 Appareil MIUI - notifications nécessitent configuration manuelle');
      }
      
      return { 
        granted: result.granted, 
        needsSettings: result.needsSettings,
        advice: result.advice
      };
    } catch (error) {
      console.error('🔥 Erreur permissions notifications:', error);
      return { granted: false };
    }
  },

  async showLocalNotification(title: string, body: string): Promise<boolean> {
    if (!this.isAndroid() || !window.PermissionsPlugin) {
      return false;
    }
    
    try {
      console.log('🔥 Affichage notification locale Android');
      const result = await window.PermissionsPlugin.showLocalNotification({
        title,
        body,
        icon: 'ic_notification'
      });
      console.log('🔥 Résultat notification locale:', result);
      return result.success;
    } catch (error) {
      console.error('🔥 Erreur notification locale:', error);
      return false;
    }
  },

  async openAppSettings(): Promise<boolean> {
    if (!this.isAndroid() || !window.PermissionsPlugin) {
      return false;
    }
    
    try {
      console.log('🔥 Ouverture paramètres Android');
      const result = await window.PermissionsPlugin.openAppSettings();
      return result.success;
    } catch (error) {
      console.error('🔥 Erreur ouverture paramètres:', error);
      return false;
    }
  }
};