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
      backgroundColor: '#1d283a'
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
    contentInset: 'always',
    allowsLinkPreview: false,
    scrollEnabled: true,
    preferredContentMode: 'mobile',
    limitsNavigationsToAppBoundDomains: false,
    scheme: 'app.runconnect',
    backgroundColor: '#1d283a'
  }
};

export default config;