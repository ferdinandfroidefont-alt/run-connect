import { Capacitor } from '@capacitor/core';

declare global {
  interface Window {
    PermissionsPlugin: {
      forceRequestLocationPermissions(): Promise<{ granted: boolean }>;
      forceRequestCameraPermissions(): Promise<{ granted: boolean }>;
      forceRequestContactsPermissions(): Promise<{ granted: boolean }>;
      openAppSettings(): Promise<{ success: boolean }>;
    };
  }
}

export const androidPermissions = {
  isAndroid: () => Capacitor.getPlatform() === 'android',

  async forceRequestLocationPermissions(): Promise<boolean> {
    if (!this.isAndroid() || !window.PermissionsPlugin) {
      console.log('🔥 Plugin Android non disponible');
      return false;
    }
    
    try {
      console.log('🔥 Demande FORCÉE permissions géolocalisation Android');
      const result = await window.PermissionsPlugin.forceRequestLocationPermissions();
      console.log('🔥 Résultat permissions géolocalisation:', result);
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