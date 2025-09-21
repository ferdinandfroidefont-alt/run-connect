import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.runconnect',
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
    }
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    // Configuration spéciale pour AAB/Google Play
    allowMultipleWindows: false,
    useLegacyBridge: false
  },
  ios: {
    scheme: 'RunConnect'
  }
};

export default config;