import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ferdi.runconnect',
  appName: 'RunConnect',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    Geolocation: {},
    Camera: {},
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#2455EB'
    },
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    // Configuration spéciale pour AAB/Google Play
    allowMultipleWindows: false,
    useLegacyBridge: false,
    // Deep linking configuré pour OAuth avec custom scheme
    deepLinkScheme: 'app.runconnect',
    // User-Agent léger pour éviter les blocages Google
    appendUserAgent: 'RunConnect/1.3'
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
    scrollEnabled: true,
    preferredContentMode: 'mobile',
    limitsNavigationsToAppBoundDomains: false,
    scheme: 'runconnect',
    /** Aligné sur le thème clair par défaut ; le web met à jour via StatusBar + CSS */
    /* Aligné sur RUCONNECT_SPLASH_BLUE (src/lib/ruconnectSplashChrome.ts) — évite flash autour du splash */
    backgroundColor: '#2455EB',
    appendUserAgent: 'RunConnect-iOS/1.3'
  }
};

export default config;