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
    // Browser config removed to allow in-app OAuth flows
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    // Configuration spéciale pour AAB/Google Play
    allowMultipleWindows: false,
    useLegacyBridge: false,
    // Deep linking configuré pour OAuth avec le bon scheme
    deepLinkScheme: 'app.runconnect'
    // User-Agent léger pour éviter les blocages Google
    appendUserAgent: 'RunConnect/1.3'
  },
  ios: {
    scheme: 'RunConnect'
  }
};

export default config;