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
     * Fond natif par défaut du WKWebView : blanc hors splash.
     * Le splash reste bleu via l'écran natif + `LoadingScreen` / `AppBootFallback`,
     * mais si iOS laisse entrevoir le fond natif (safe area, reprise app, transition),
     * on veut voir du blanc et jamais la teinte splash.
     */
    backgroundColor: '#FFFFFF',
    appendUserAgent: 'RunConnect-iOS/1.3'
  }
};

export default config;