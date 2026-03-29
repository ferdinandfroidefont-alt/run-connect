import { useEffect, type ReactNode } from 'react';
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';
import { Capacitor } from '@capacitor/core';
import { applyIosStatusBarForTheme, applyWebChromeForTheme } from '@/lib/iosStatusBarTheme';

const STORAGE_KEY = 'runconnect-ui-theme';

/** Synchronise theme-color, fond root, meta Apple et barre d’état native (iOS/Android) avec le thème. */
function ThemeMetaSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const isDark = resolvedTheme === 'dark';
    const applyChrome = () => {
      applyWebChromeForTheme(isDark);
      void applyIosStatusBarForTheme(isDark);
    };

    applyChrome();

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
  }, [resolvedTheme]);

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
      {children}
    </NextThemesProvider>
  );
}

export { useTheme };
