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
    // Deep linking configuré pour OAuth avec App Links (HTTPS)
    deepLinkScheme: 'https',
    // User-Agent léger pour éviter les blocages Google
    appendUserAgent: 'RunConnect/1.3'
  },
  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
    scrollEnabled: true,
    preferredContentMode: 'mobile',
    limitsNavigationsToAppBoundDomains: false,
    // Deep linking pour OAuth (même scheme qu'Android)
    scheme: 'app.runconnect'
  }
};

export default config;