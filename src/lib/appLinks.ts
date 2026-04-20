type ProfileLinkOptions = {
  username: string;
  referralCode?: string | null;
};

const RAW_WEB_ORIGIN = import.meta.env.VITE_PUBLIC_APP_ORIGIN || 'https://runconnect.app';
export const APP_WEB_ORIGIN = RAW_WEB_ORIGIN.replace(/\/+$/, '');
export const LEGACY_WEB_ORIGIN = 'https://run-connect.lovable.app';
export const APP_DEEP_LINK_SCHEME = 'runconnect://';

export const ANDROID_STORE_URL =
  import.meta.env.VITE_PUBLIC_ANDROID_STORE_URL ||
  'https://play.google.com/store/apps/details?id=com.ferdi.runconnect';
export const IOS_STORE_URL = import.meta.env.VITE_PUBLIC_IOS_STORE_URL || APP_WEB_ORIGIN;

/** Profil public court (partage, Universal Links). */
export function buildProfileUniversalLink({ username, referralCode }: ProfileLinkOptions): string {
  const base = `${APP_WEB_ORIGIN}/u/${encodeURIComponent(username)}`;
  return referralCode ? `${base}?r=${encodeURIComponent(referralCode)}` : base;
}

/** Lien canonique page profil web (historique `/p/`). */
export function buildProfileWebPath(username: string): string {
  return `/p/${encodeURIComponent(username)}`;
}

/** URL publique à copier / partager (identique au lien universel). */
export function getProfilePublicUrl(username: string, referralCode?: string | null): string {
  return buildProfileUniversalLink({ username, referralCode: referralCode ?? undefined });
}

export function buildProfileDeepLink({ username, referralCode }: ProfileLinkOptions): string {
  const base = `${APP_DEEP_LINK_SCHEME}profile/${encodeURIComponent(username)}`;
  return referralCode ? `${base}?r=${encodeURIComponent(referralCode)}` : base;
}

export function buildSessionUniversalLink(sessionId: string): string {
  return `${APP_WEB_ORIGIN}/?session=${encodeURIComponent(sessionId)}`;
}

export function buildSessionDeepLink(sessionId: string): string {
  return `${APP_DEEP_LINK_SCHEME}session/${encodeURIComponent(sessionId)}`;
}

/**
 * Share URL priority:
 * - universal link (opens app if installed)
 * - web fallback when app missing.
 */
export function buildPreferredProfileShareLink(options: ProfileLinkOptions): string {
  return buildProfileUniversalLink(options);
}

export function buildPreferredSessionShareLink(sessionId: string): string {
  return `${APP_WEB_ORIGIN}/open/session/${encodeURIComponent(sessionId)}`;
}

/** URL publique courte (partage texte / réseaux) — redirige vers la même landing que `/open/session/:id`. */
export function buildShortSessionUniversalLink(sessionId: string): string {
  return `${APP_WEB_ORIGIN}/s/${encodeURIComponent(sessionId)}`;
}

/** Alias explicite pour le partage de séance (lien universel). */
export function getSessionPublicUrl(sessionId: string): string {
  return buildShortSessionUniversalLink(sessionId);
}

export function getStoreFallbackUrl(): string {
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return ANDROID_STORE_URL;
  if (/iphone|ipad|ipod/i.test(ua)) return IOS_STORE_URL;
  return APP_WEB_ORIGIN;
}

/**
 * Converts incoming deep/universal links into in-app routes.
 */
export function resolveIncomingAppUrl(rawUrl: string): string | null {
  if (!rawUrl) return null;

  // Existing auth callback deep links are handled elsewhere.
  if (
    rawUrl.startsWith('runconnect://auth/callback') ||
    rawUrl.startsWith('app.runconnect://auth/callback')
  ) {
    return null;
  }

  try {
    // Normalize legacy scheme app.runconnect:// -> runconnect://
    const normalized =
      rawUrl.startsWith('app.runconnect://') ? rawUrl.replace('app.runconnect://', 'runconnect://') : rawUrl;
    const url = new URL(normalized);

    // Custom deep links: runconnect://profile/:username / runconnect://session/:id
    if (url.protocol === 'runconnect:') {
      const host = url.hostname;
      const rest = url.pathname.replace(/^\/+/, '');
      if (host === 'profile' && rest) {
        return `/p/${decodeURIComponent(rest)}${url.search || ''}`;
      }
      if (host === 'session' && rest) {
        return `/?session=${encodeURIComponent(decodeURIComponent(rest))}`;
      }
      if (host === 'confirm-presence' && rest) {
        return `/confirm-presence/${decodeURIComponent(rest)}`;
      }
      if (host === 'profile' && !rest) {
        return '/profile';
      }
    }

    // Universal links: https://runconnect.app/...
    const allowedHosts = new Set([
      new URL(APP_WEB_ORIGIN).hostname,
      new URL(LEGACY_WEB_ORIGIN).hostname,
    ]);
    if (allowedHosts.has(url.hostname)) {
      if (url.pathname.startsWith('/p/')) return `${url.pathname}${url.search}`;
      if (url.pathname.startsWith('/u/')) {
        const u = url.pathname.slice('/u/'.length);
        if (u) return `/p/${decodeURIComponent(u)}${url.search}`;
      }
      if (url.pathname.startsWith('/s/')) {
        const id = url.pathname.slice('/s/'.length);
        if (id) return `/?session=${encodeURIComponent(decodeURIComponent(id))}`;
      }
      if (url.pathname === '/' && url.searchParams.get('session')) return `/${url.search}`;
      if (url.pathname.startsWith('/confirm-presence')) return `${url.pathname}${url.search}`;
      if (url.pathname === '/profile' || url.pathname.startsWith('/profile/')) return `${url.pathname}${url.search}`;
      return `${url.pathname}${url.search}`;
    }
  } catch (error) {
    console.warn('[appLinks] Failed to parse incoming URL:', rawUrl, error);
  }

  return null;
}
