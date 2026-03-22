import { useEffect } from 'react';
import {
  applyRuconnectSplashNativeChrome,
  applyRuconnectSplashWebChrome,
  restoreChromeAfterRuconnectSplash,
} from '@/lib/ruconnectSplashChrome';

/**
 * Applique le fond + barres bleues Ruconnect (même teinte que l’icône) tant que `active` est vrai.
 * Restaure le thème utilisateur au démontage (évite conflit / effet « zoom » lié au changement de chrome).
 */
export function useRuconnectSplashScreenChrome(active: boolean) {
  useEffect(() => {
    if (!active) return;

    applyRuconnectSplashWebChrome();
    void applyRuconnectSplashNativeChrome();

    return () => {
      void restoreChromeAfterRuconnectSplash();
    };
  }, [active]);
}
