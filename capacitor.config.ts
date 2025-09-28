import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.runconnect',
  appName: 'RunConnect',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    Geolocation: {
      requestPermissions: true
    },
    Camera: {
      requestPermissions: true
    },
    Browser: {
      windowName: '_system'
    }
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    // Configuration spéciale pour AAB/Google Play
    allowMultipleWindows: false,
    useLegacyBridge: false,
    // Force l'ouverture dans le navigateur système pour OAuth
    overrideUserAgent: 'RunConnect Mobile App',
    // Optimisations galerie Android 13+
    deepLinkScheme: 'runconnect',
    appendUserAgent: 'RunConnect/1.3'
  },
  ios: {
    scheme: 'RunConnect'
  }
};

export default config;