
# Suppression totale des barres iPhone (haut et bas)

## Objectif
Supprimer toute trace visible des barres safe area iOS : plus aucun padding en haut (notch) ni en bas (home indicator). Le contenu doit occuper 100% de l'ecran, bord a bord, sans espace reserve visible.

## Ce qui sera fait

### 1. Supprimer les classes `pt-safe` et `pb-safe` de TOUTES les pages et composants

Fichiers concernes (32 fichiers au total) :

**Composants principaux :**
- `src/components/BottomNavigation.tsx` : retirer `pb-safe` de la nav
- `src/components/SearchHeader.tsx` : retirer `pt-safe` du header
- `src/components/SettingsDialog.tsx` : retirer `pt-safe`
- `src/components/session-creation/CreateSessionWizard.tsx` : retirer `pt-safe`
- `src/components/RouteEditDialog.tsx` : retirer `pt-safe`
- `src/components/feed/FeedHeader.tsx` : retirer `pt-safe`
- `src/components/LoadingScreen.tsx` : retirer `pb-safe`
- Tout autre composant utilisant `pt-safe` ou `pb-safe`

**Pages :**
- `src/pages/Auth.tsx` : retirer `pt-safe`
- `src/pages/Profile.tsx` : retirer `pt-safe`
- `src/pages/Leaderboard.tsx` : retirer `pt-safe`
- `src/pages/MySessions.tsx` : retirer `pt-safe`
- `src/pages/Search.tsx` : retirer `pt-safe` et `paddingBottom: env(safe-area-inset-bottom)`
- `src/pages/RouteCreation.tsx` : retirer `pt-safe`
- `src/pages/Terms.tsx` : retirer `pb-safe`
- `src/pages/Privacy.tsx` : retirer `pb-safe`
- `src/pages/About.tsx` : retirer `pb-safe`
- `src/pages/NotFound.tsx` : retirer `pb-safe`
- `src/pages/PublicProfile.tsx` : retirer `pb-safe`
- `src/pages/ConfirmPresence.tsx` : retirer `pb-safe`
- `src/pages/DonationSuccess.tsx` : retirer `pb-safe`
- `src/pages/DonationCanceled.tsx` : retirer `pb-safe`
- `src/pages/Messages.tsx` : retirer tout `env(safe-area-inset-bottom)` et `pt-safe`
- `src/pages/Feed.tsx` : retirer si present

### 2. Nettoyer le CSS global
Dans `src/index.css` :
- Supprimer les classes `.pb-safe` et `.pt-safe` (elles ne serviront plus)

### 3. Resultat attendu
- Zero espace reserve en haut pour le notch : le contenu (headers, cartes) monte jusqu'au bord superieur de l'ecran
- Zero espace reserve en bas pour le home indicator : la nav bar et le contenu descendent jusqu'au bord inferieur
- L'app occupe 100% de la surface de l'ecran, sans aucune "barre" visible
