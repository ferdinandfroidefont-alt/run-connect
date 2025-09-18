import { Capacitor } from '@capacitor/core';

declare global {
  interface Window {
    PermissionsPlugin: {
      forceRequestLocationPermissions(): Promise<{ granted: boolean; device?: any }>;
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
  // FIX AAB: Détection Android plus robuste pour Play Store AAB
  isAndroid: () => {
    const platform = Capacitor.getPlatform();
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Si Capacitor détecte Android, c'est bon
    if (platform === 'android') return true;
    
    // Si Capacitor dit "web" mais qu'on est sur Android (cas AAB Play Store)
    if (platform === 'web' && userAgent.includes('android')) {
      console.log('🔥 FIX AAB: Android détecté malgré platform=web');
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
      console.log('🔥 Plugin Android non disponible');
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
      }
      
      return result.granted;
    } catch (error) {
      console.error('🔥 Erreur permissions géolocalisation:', error);
      return false;
    }
  },

  async forceRequestCameraPermissions(): Promise<boolean> {
    if (!this.isAndroid() || !window.PermissionsPlugin) {
      console.log('🔥 Plugin Android non disponible');
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
      console.log('🔥 Plugin Android non disponible');
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
      console.log('🔥 Plugin Android non disponible pour galerie');
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
      console.log('🔥 Plugin Android non disponible pour notifications');
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
      console.log('🔥 Plugin Android non disponible pour notifications');
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
      console.log('🔥 Plugin Android non disponible');
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