# RunConnect — optimisation & lancement grand public

Ce document complète les **améliorations déjà intégrées dans le code** et ce qu’il reste à brancher côté **outils / stores**.

## Déjà en place (code)

| Sujet | Détail |
|--------|--------|
| **Code-splitting** | Pages chargées en `lazy()` + `Suspense` → bundle initial plus léger. |
| **Build Vite** | `manualChunks` (React, Radix, Supabase, Motion, icônes) → cache navigateur plus efficace. |
| **React Query** | `refetchOnReconnect: true` → données rafraîchies au retour du réseau. |
| **Hors ligne** | Bandeau global `NetworkStatusBanner` (toutes les routes). |
| **Erreurs React** | `AppErrorBoundary` : bouton **Réessayer** sans recharger + rechargement complet. |
| **Analytics (stub)** | `src/lib/analytics.ts` + `RouteAnalytics` : prêt pour GA4 / autre (voir variables d’env). |
| **RGPD / compte** | Suppression de compte (edge function) dans les paramètres support. |

## Variables d’environnement (optionnel)

Crée ou complète `.env` (ne commite pas de secrets) :

```env
# Logs des « screens » en console pendant le dev
VITE_ANALYTICS_DEBUG=true

# En prod : envoie les events vers gtag si tu as chargé le script Google
VITE_ANALYTICS_ENABLED=true
```

Pour **GA4** : ajoute le script gtag dans `index.html` ou un chargeur dynamique, puis `analytics.event()` / `analytics.screen()` fonctionneront quand `VITE_ANALYTICS_ENABLED=true`.

**Consentement RGPD** : même avec `VITE_ANALYTICS_ENABLED=true`, **aucun envoi gtag** n’est fait tant que l’utilisateur n’a pas accepté (bandeau `AnalyticsConsentBanner` + interrupteur dans **Paramètres → Confidentialité**). Préférence stockée dans `localStorage` (`runconnect-analytics-consent-v1`).

## À faire hors repo (recommandé avant le grand public)

1. **Crash reporting** : [Sentry](https://sentry.io) (ou Firebase Crashlytics) — init dans `main.tsx` avec DSN en env.
2. **Stores** : fiches App Store / Play, captures, URL politique de confidentialité, compte support.
3. **Tests manuels** : parcours inscription → 1ère séance → message → carte avec réseau coupé/rallumé.
4. **Accessibilité** : VoiceOver sur iOS sur les 5 écrans principaux ; contrastes WCAG sur boutons critiques.
5. **Performance** : Lighthouse mobile sur `/` et `/feed` ; vérifier poids des images carte / avatars.

## Légal, sécurité, design & produit

Voir **`docs/LEGAL_SECURITY_DESIGN.md`** (checklist stores, RGPD, sécurité, UX) et **`SECURITY.md`** (signalement vulnérabilités).  
Règles persistantes pour Cursor : **`.cursor/rules/runconnect.mdc`**.

## Prochaines optimisations code (idées)

- Précharger la page suivante au `touchstart` sur la tab bar.
- `loading="lazy"` + tailles explicites sur les grosses images hors above-the-fold.
- Service worker / cache stratégique (si besoin mode offline lecture seule).
