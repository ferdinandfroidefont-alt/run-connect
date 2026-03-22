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
    /* Fond par défaut = coque app claire : évite la bande bleue (#2455EB) sous le WebView quand iOS laisse voir la couche native (safe area, dvh, etc.). Le splash reste géré par LoadingScreen / Splash natif. */
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#FFFFFF',
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
    /**
     * Doit matcher le fond réel des écrans (clair / sombre via contenu Web), pas le bleu splash :
     * sinon une bande bleue intermittente apparaît sous la tab bar (couche native visible dans la safe area).
     */
    backgroundColor: '#FFFFFF',
    appendUserAgent: 'RunConnect-iOS/1.3'
  }
};

export default config;