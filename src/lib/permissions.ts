import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export const openAppSettings = async (): Promise<void> => {
  const platform = Capacitor.getPlatform();
  
  console.log(`⚙️ Ouverture des paramètres (${platform})...`);
  
  try {
    if (platform === 'ios' || platform === 'android') {
      // Utiliser le plugin App pour ouvrir les paramètres natifs
      await App.addListener('appStateChange', () => {});
      const url = platform === 'ios' ? 'app-settings:' : 'package:app.runconnect';
      if (typeof (window as any).open !== 'undefined') {
        (window as any).open(url);
      }
    }
    console.log('✅ Tentative d\'ouverture des paramètres');
  } catch (error) {
    console.error('❌ Erreur ouverture paramètres:', error);
    
    // Fallback : instructions manuelles
    if (platform === 'ios') {
      alert('Veuillez ouvrir Réglages > RunConnect pour activer les permissions');
    } else if (platform === 'android') {
      alert('Veuillez ouvrir Paramètres > Applications > RunConnect > Permissions');
    }
  }
};

export const getPermissionInstructions = (permission: string): string => {
  const platform = Capacitor.getPlatform();
  
  const instructions: Record<string, Record<string, string>> = {
    android: {
      notifications: 'Paramètres → Applications → RunConnect → Notifications',
      location: 'Paramètres → Applications → RunConnect → Autorisations → Position',
      camera: 'Paramètres → Applications → RunConnect → Autorisations → Appareil photo',
      contacts: 'Paramètres → Applications → RunConnect → Autorisations → Contacts'
    },
    ios: {
      notifications: 'Réglages → RunConnect → Notifications',
      location: 'Réglages → RunConnect → Localisation',
      camera: 'Réglages → RunConnect → Appareil photo',
      contacts: 'Réglages → RunConnect → Contacts'
    }
  };
  
  return instructions[platform]?.[permission] || 
         'Ouvrez les paramètres de votre appareil pour activer cette permission';
};
