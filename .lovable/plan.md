
# Fond de la zone Safe Area Bottom adapte a chaque page

## Probleme
Actuellement, la zone du home indicator en bas de l'ecran iPhone a toujours la meme couleur (celle du WebView natif `#0F1729`). Cela cree une coupure visuelle : on voit clairement ou la page s'arrete et ou la barre commence. L'objectif est que cette zone soit le prolongement naturel de chaque page, invisible a l'oeil.

## Strategie
La zone safe area bottom est controlee par le WebView natif (couleur `ios.backgroundColor` dans `capacitor.config.ts`). On ne peut pas la changer dynamiquement depuis le CSS. La solution est de faire en sorte que **chaque page etende son propre fond jusque dans la zone du home indicator** via `padding-bottom: env(safe-area-inset-bottom)` sur le conteneur principal, avec la meme couleur de fond que la page.

Pour les pages avec `Layout` (nav bar en bas), la `BottomNavigation` elle-meme doit s'etendre dans la safe area avec le meme fond.

## Pages et couleurs associees

| Page | Couleur de fond | Type |
|------|----------------|------|
| LoadingScreen | `bg-secondary` | Standalone |
| Auth | `bg-secondary` | Standalone |
| Index (carte) | Carte Google Maps | Layout |
| Feed | `bg-secondary` | Layout |
| MySessions | `bg-secondary` | Layout |
| Messages (liste) | `bg-secondary` | Layout |
| Messages (conversation) | `bg-background` | Standalone (nav masquee) |
| Leaderboard | `bg-secondary` | Layout |
| Profile | `bg-secondary` | Layout |
| Subscription | `bg-secondary` | Layout |
| Search | `bg-secondary` | Standalone |
| RouteCreation | `bg-background` | Standalone |
| Privacy | `bg-background` | Standalone |
| Terms | `bg-secondary` | Standalone |
| About | `bg-secondary` | Standalone |
| ConfirmPresence | `bg-secondary` | Standalone |
| NotFound | `bg-secondary` | Standalone |
| DonationSuccess/Canceled | `bg-background` | Standalone |
| PublicProfile | `bg-secondary` | Standalone |

## Modifications fichier par fichier

### 1. `src/components/BottomNavigation.tsx`
- Ajouter `pb-safe` (padding-bottom safe area) a la `nav` pour que la barre de navigation s'etende dans la zone du home indicator
- Le fond `bg-background/80 backdrop-blur-xl` couvrira naturellement la safe area

### 2. `src/components/Layout.tsx`
- Ajouter `pb-safe` au conteneur racine pour que le fond `bg-background` couvre la safe area quand la nav est masquee

### 3. `src/components/LoadingScreen.tsx`
- Ajouter `pb-safe` au conteneur `fixed inset-0` pour que le `bg-secondary` s'etende dans la safe area

### 4. `src/pages/Auth.tsx`
- Ajouter `pb-safe` au conteneur principal pour que le `bg-secondary` couvre la safe area

### 5. `src/pages/About.tsx`
- Ajouter `pb-safe` au conteneur `fixed inset-0`

### 6. `src/pages/Terms.tsx`
- Ajouter `pb-safe` au conteneur `fixed inset-0`

### 7. `src/pages/Privacy.tsx`
- Ajouter `pb-safe` au conteneur `fixed inset-0`

### 8. `src/pages/ConfirmPresence.tsx`
- Ajouter `pb-safe` au conteneur `fixed inset-0`

### 9. `src/pages/NotFound.tsx`
- Ajouter `pb-safe` au conteneur `fixed inset-0`

### 10. `src/pages/RouteCreation.tsx`
- Ajouter `pb-safe` au conteneur `fixed inset-0`

### 11. `src/pages/Search.tsx`
- Deja gere via `paddingBottom: env(safe-area-inset-bottom)` inline

### 12. `src/pages/DonationSuccess.tsx` et `src/pages/DonationCanceled.tsx`
- Ajouter `pb-safe` au conteneur `fixed inset-0`

### 13. `src/pages/PublicProfile.tsx`
- Ajouter `pb-safe` au conteneur `fixed inset-0`

### 14. `src/pages/Messages.tsx` (vue conversation)
- Deja gere via `paddingBottom: calc(... + env(safe-area-inset-bottom))` sur la zone de saisie

### 15. `capacitor.config.ts`
- Optionnel: changer `ios.backgroundColor` de `#0F1729` a une couleur plus neutre comme la couleur secondary du theme sombre, pour que le fallback natif soit le plus discret possible

### 16. `index.html`
- S'assurer que `viewport-fit=cover` est present (deja le cas) pour que `env(safe-area-inset-bottom)` fonctionne

## Details techniques
- La classe utilitaire `pb-safe` existe deja dans `index.css` : `padding-bottom: env(safe-area-inset-bottom, 0px)`
- `viewport-fit=cover` est deja configure dans `index.html`
- Pour les pages avec `Layout` + `BottomNavigation`, c'est la nav bar qui doit couvrir la safe area (elle est en position fixed bottom)
- Pour les pages standalone (Auth, Search, etc.), c'est le conteneur principal qui doit s'etendre
- La couleur native `ios.backgroundColor` sert uniquement de fallback pendant le chargement du WebView
