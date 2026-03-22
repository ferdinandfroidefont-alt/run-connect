import { useEffect, type ReactNode } from 'react';
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';
import { applyIosStatusBarForTheme, applyWebChromeForTheme } from '@/lib/iosStatusBarTheme';

const STORAGE_KEY = 'runconnect-ui-theme';

/** Synchronise theme-color, fond root, meta Apple et StatusBar Capacitor iOS avec le thème. */
function ThemeMetaSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const isDark = resolvedTheme === 'dark';
    applyWebChromeForTheme(isDark);
    void applyIosStatusBarForTheme(isDark);
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
