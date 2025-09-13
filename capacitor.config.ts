import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.91401b079cff4f0594e73eb42a9b7a7a',
  appName: 'RunConnect',
  webDir: 'dist',
  server: {
    url: 'https://91401b07-9cff-4f05-94e7-3eb42a9b7a7a.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Contacts: {
      permissions: ['contacts']
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    Camera: {
      permissions: ['camera', 'photos']
    },
    Geolocation: {
      permissions: ['location']
    }
  }
};

export default config;