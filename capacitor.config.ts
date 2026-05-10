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
    /* Fond statut par défaut ; le splash natif + LoadingScreen sont bleus (#0066CC). */
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0066CC',
    },
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true,
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
    /**
     * `never` : les insets safe-area viennent uniquement du CSS (`env(safe-area-inset-*)` + tab bar).
     * `automatic` sur WKWebView + notre barre d’onglets pouvait cumuler deux « bandes » en bas après
     * certaines pages (ex. Recherche + scroll/clavier).
     */
    contentInset: 'never',
    allowsLinkPreview: false,
    scrollEnabled: true,
    preferredContentMode: 'mobile',
    limitsNavigationsToAppBoundDomains: false,
    scheme: 'runconnect',
    /**
     * Fond WKWebView aligné sur le Launch Screen / splash (#0066CC) pour éviter un flash blanc à la transition.
     */
    backgroundColor: '#0066CC',
    appendUserAgent: 'RunConnect-iOS/1.3'
  }
};

export default config;