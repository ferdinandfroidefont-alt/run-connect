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
    /* Fond par défaut = coque app claire : évite une bande colorée sous le WebView quand iOS laisse voir la couche native (safe area, dvh, etc.). Le splash reste géré par LoadingScreen / Splash natif. */
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
     * Même bleu que le splash (`RUCONNECT_SPLASH_BLUE` / LoadingScreen) : sinon iOS affiche une bande
     * blanche native dans la safe area basse pendant le chargement. La tab bar peint le bas avec
     * `bg-background` sur `<nav>` pour ne pas laisser voir ce bleu une fois l’app chargée.
     */
    backgroundColor: '#2E68FF',
    appendUserAgent: 'RunConnect-iOS/1.3'
  }
};

export default config;