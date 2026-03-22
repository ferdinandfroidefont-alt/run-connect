import { isAnalyticsTrackingAllowed } from '@/lib/analyticsConsent';

/**
 * Couche analytics minimale — prête pour GA4 / Plausible / PostHog sans coupler le code.
 *
 * - Dev : logs console si VITE_ANALYTICS_DEBUG=true
 * - Prod : envoi vendor seulement si VITE_ANALYTICS_ENABLED=true **et** consentement (analyticsConsent.ts)
 */

const DEBUG = import.meta.env.VITE_ANALYTICS_DEBUG === 'true';
const ENABLED = import.meta.env.VITE_ANALYTICS_ENABLED === 'true';

function maySendToVendor(): boolean {
  return ENABLED && isAnalyticsTrackingAllowed();
}

function log(kind: string, name: string, params?: Record<string, unknown>) {
  if (import.meta.env.DEV && DEBUG) {
    console.debug(`[analytics:${kind}]`, name, params ?? {});
  }
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export const analytics = {
  /** Changement de route (SPA) */
  screen(path: string, title?: string) {
    log('screen', path, { title });
    if (!maySendToVendor()) return;
    try {
      window.gtag?.('event', 'page_view', {
        page_path: path,
        page_title: title ?? document.title,
      });
    } catch {
      /* ignore */
    }
  },

  /** Événement produit (ex: session_created, subscription_started) */
  event(name: string, params?: Record<string, unknown>) {
    log('event', name, params);
    if (!maySendToVendor()) return;
    try {
      window.gtag?.('event', name, params);
    } catch {
      /* ignore */
    }
  },
};
