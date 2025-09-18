import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.91401b07-9cff-4f05-94e7-3eb42a9b7a7a',
  appName: 'RunConnect',
  webDir: 'dist',
  // Pour les builds AAB/APK de production, ne PAS utiliser le serveur Lovable
  // Commenté pour forcer l'utilisation des fichiers locaux et les permissions natives
  /*
  server: {
    url: 'https://91401b07-9cff-4f05-94e7-3eb42a9b7a7a.lovableproject.com?forceHideBadge=true',
    androidScheme: 'https',
    cleartext: false,
    allowNavigation: [
      '91401b07-9cff-4f05-94e7-3eb42a9b7a7a.lovableproject.com',
      'run-connect.lovable.app',
      '*.lovableproject.com'
    ]
  },
  */
  plugins: {
    // Ces options contrôlent seulement l’affichage iOS des notifications
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] }
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: true
  }
};

export default config;
