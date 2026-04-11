import { useEffect, useState, type ReactNode } from 'react';
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';
import { Capacitor } from '@capacitor/core';
import { applyIosStatusBarForTheme, applyWebChromeForTheme } from '@/lib/iosStatusBarTheme';
import { syncMapStyleWithAppTheme } from '@/lib/mapboxMapStylePreference';
import { ACCENT_STORAGE_KEY, applyAccentToDocument, getStoredAccent } from '@/lib/accentColor';
import {
  applyVisualModeToDocument,
  getStoredVisualMode,
  isDeepBlueVisualFromDom,
  subscribeVisualMode,
  VISUAL_MODE_STORAGE_KEY,
} from '@/lib/visualMode';

const STORAGE_KEY = 'runconnect-ui-theme';

/** Synchronise theme-color, fond root, meta Apple et barre d’état native (iOS/Android) avec le thème. */
function ThemeMetaSync() {
  const { resolvedTheme } = useTheme();
  const [visualEpoch, setVisualEpoch] = useState(0);

  useEffect(() => subscribeVisualMode(() => setVisualEpoch((n) => n + 1)), []);

  useEffect(() => {
    const isDark = resolvedTheme === 'dark';
    const deepBlue = isDeepBlueVisualFromDom();
    const applyChrome = () => {
      applyWebChromeForTheme(isDark, deepBlue);
      void applyIosStatusBarForTheme(isDark, deepBlue);
    };

    applyChrome();

    if (resolvedTheme === 'dark' || resolvedTheme === 'light' || deepBlue) {
      syncMapStyleWithAppTheme(isDark || deepBlue);
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        applyChrome();
      }
    };

    window.addEventListener('focus', applyChrome);
    document.addEventListener('visibilitychange', onVisibilityChange);

    let cancelled = false;
    let removeNativeListener: (() => void) | null = null;
    if (Capacitor.isNativePlatform()) {
      void import('@capacitor/app')
        .then(({ App }) => App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            applyChrome();
          }
        }))
        .then((listener) => {
          if (cancelled) {
            void listener.remove();
            return;
          }
          removeNativeListener = () => {
            void listener.remove();
          };
        })
        .catch(() => {
          /* plugin indisponible */
        });
    }

    return () => {
      cancelled = true;
      window.removeEventListener('focus', applyChrome);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      removeNativeListener?.();
    };
  }, [resolvedTheme, visualEpoch]);

  return null;
}

/** Synchronise l’accent (bleu RunConnect / bleu nuit) entre onglets. */
function AccentColorSync() {
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === ACCENT_STORAGE_KEY) applyAccentToDocument(getStoredAccent());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  return null;
}

/** Synchronise le mode visuel Deep Blue entre onglets. */
function VisualModeStorageSync() {
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== VISUAL_MODE_STORAGE_KEY) return;
      applyVisualModeToDocument(getStoredVisualMode());
      window.dispatchEvent(new Event('runconnect-visual-mode'));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  return null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey={STORAGE_KEY}
      disableTransitionOnChange={false}
    >
      <ThemeMetaSync />
      <AccentColorSync />
      <VisualModeStorageSync />
      {children}
    </NextThemesProvider>
  );
}

export { useTheme };
