import { useEffect, type ReactNode } from 'react';
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';

const STORAGE_KEY = 'runconnect-ui-theme';

/** Synchronise la barre d’état / theme-color avec le thème résolu (web). */
function ThemeMetaSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const isDark = resolvedTheme === 'dark';
    const themeColor = isDark ? '#1C1C1E' : '#F2F2F7';
    const meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (meta) meta.setAttribute('content', themeColor);
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
