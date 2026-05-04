import { registerPlugin } from '@capacitor/core';

export interface RunConnectSplashChromePlugin {
  setLoadingPresentationActive(options: { active: boolean }): Promise<void>;
}

export const RunConnectSplashChrome = registerPlugin<RunConnectSplashChromePlugin>(
  'RunConnectSplashChrome',
  {
    web: async () => ({
      setLoadingPresentationActive: async () => {},
    }),
    android: async () => ({
      setLoadingPresentationActive: async () => {},
    }),
  },
);
