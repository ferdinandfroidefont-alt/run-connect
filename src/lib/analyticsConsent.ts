/**
 * Consentement utilisateur pour l’envoi d’événements analytics (ex. GA4).
 * Stockage local uniquement — à combiner avec `VITE_ANALYTICS_ENABLED=true` et chargement gtag.
 *
 * Tant que l’utilisateur n’a pas accepté explicitement, aucun hit n’est envoyé (voir `analytics.ts`).
 */
export const ANALYTICS_CONSENT_STORAGE_KEY = "runconnect-analytics-consent-v1";

export type AnalyticsConsentValue = "granted" | "denied" | "unset";

export function getAnalyticsConsent(): AnalyticsConsentValue {
  try {
    const v = localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    if (v === "granted" || v === "denied") return v;
    return "unset";
  } catch {
    return "unset";
  }
}

/** `true` seulement si l’utilisateur a explicitement accepté. */
export function isAnalyticsTrackingAllowed(): boolean {
  return getAnalyticsConsent() === "granted";
}

export function setAnalyticsConsent(accept: boolean): void {
  try {
    localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, accept ? "granted" : "denied");
    window.dispatchEvent(new CustomEvent("runconnect-analytics-consent-changed"));
  } catch {
    /* ignore */
  }
}

export function isAnalyticsFeatureEnabledInBuild(): boolean {
  return import.meta.env.VITE_ANALYTICS_ENABLED === "true";
}
