import { Capacitor } from '@capacitor/core';

declare global {
  interface Window {
    PermissionsPlugin: {
      forceRequestLocationPermissions(): Promise<{ granted: boolean; device?: any }>;
      forceRequestCameraPermissions(): Promise<{ granted: boolean; device?: any }>;
      forceRequestContactsPermissions(): Promise<{ granted: boolean; device?: any }>;
      openAppSettings(): Promise<{ success: boolean; device?: any }>;
      getDeviceInfo(): Promise<{ device: any }>;
      forceOpenGallery(): Promise<{ success: boolean; method?: string; device?: any }>;
    };
  }
}

export const androidPermissions = {
  isAndroid: () => Capacitor.getPlatform() === 'android',

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

  async forceOpenGallery(): Promise<{ success: boolean; method?: string }> {
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
      
      return { success: result.success, method: result.method };
    } catch (error) {
      console.error('🔥 Erreur ouverture galerie:', error);
      return { success: false };
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