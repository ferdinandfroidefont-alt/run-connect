
# Plan de correction : Redirections Stripe sur mobile natif

## Problème identifié

Les redirections vers Stripe (paiements, dons, portail client) ne fonctionnent pas sur l'app Android native car :
- Le code utilise `window.location.href` et `window.open()` pour ouvrir les URLs Stripe
- La WebView Android bloque explicitement les popups (`onCreateWindow` retourne `false`)
- Ces méthodes JavaScript standards ne fonctionnent pas dans une WebView native

Tu vois le message "Redirection Stripe - vous allez être redirigé vers la page de paiement" mais la page Stripe ne s'ouvre jamais.

## Solution

Utiliser le plugin `@capacitor/browser` (déjà installé) pour ouvrir les URLs Stripe dans Chrome Custom Tabs, exactement comme c'est fait pour la connexion Strava qui fonctionne parfaitement.

## Modifications à effectuer

### 1. Subscription.tsx - Paiements d'abonnement

**Fichier :** `src/pages/Subscription.tsx`

**Changements :**
- Ajouter les imports `Browser` de `@capacitor/browser` et `Capacitor` de `@capacitor/core`
- Modifier `handleSubscribe` : utiliser `Browser.open()` si on est sur plateforme native, sinon `window.location.href`
- Modifier `handleManageSubscription` : utiliser `Browser.open()` si natif, sinon `window.open()`

### 2. DonationDialog.tsx - Dons

**Fichier :** `src/components/DonationDialog.tsx`

**Changements :**
- Ajouter les imports `Browser` de `@capacitor/browser` et `Capacitor` de `@capacitor/core`
- Modifier `handleDonation` : utiliser `Browser.open()` si on est sur plateforme native, sinon `window.open()`

## Détails techniques

```text
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Clic bouton   │──▶───│  Détection mode  │──▶───│   Ouverture     │
│   Paiement/Don  │      │  Capacitor.is    │      │   URL Stripe    │
│                 │      │  NativePlatform  │      │                 │
└─────────────────┘      └──────────────────┘      └─────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
              ┌─────▼─────┐               ┌─────▼─────┐
              │  NATIF    │               │    WEB    │
              │           │               │           │
              │ Browser.  │               │ window.   │
              │ open()    │               │ location  │
              │           │               │ ou open() │
              └───────────┘               └───────────┘
```

**Code type pour la détection :**
```typescript
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

// Pour ouvrir une URL externe (paiement Stripe)
if (isNative) {
  await Browser.open({ url: stripeUrl, presentationStyle: 'popover' });
} else {
  window.location.href = stripeUrl; // ou window.open pour nouvel onglet
}
```

## Résultat attendu

Après ces modifications :
- Sur l'app Android native : Chrome Custom Tabs s'ouvrira avec la page Stripe
- L'utilisateur pourra compléter son paiement
- Après paiement, il reviendra dans l'app via les URLs de retour (`success_url`, `cancel_url`)
- Sur le web (navigateur) : comportement inchangé
