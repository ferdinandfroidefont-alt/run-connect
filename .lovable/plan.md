
# Redesign unifie : une seule couleur de fond partout

## Objectif

Supprimer le pattern sportif et unifier toute l'application sur **une seule couleur de fond** identique a la zone native WKWebView (`#1d283a` en dark mode = `--background`). La status bar en haut et la zone home indicator en bas seront naturellement de la meme couleur que le contenu de l'app -- zero decalage visuel.

## Diagnostic actuel

Aujourd'hui, la majorite des pages utilisent `bg-secondary` (#465467) comme fond de page, tandis que la zone native WKWebView est en `#1d283a` (`--background`). Cela cree une rupture de couleur visible en haut et en bas de l'ecran sur iOS natif. Le pattern sportif ajoute aussi du bruit visuel.

## Changements

### 1. Supprimer le pattern sportif

**`src/index.css`** : Supprimer entierement le bloc `.bg-pattern` et ses variantes (`.dark .bg-pattern::before`, `:not(.dark) .bg-pattern::before`) aux lignes 293-315.

**36 fichiers** : Retirer la classe `bg-pattern` de toutes les utilisations dans le code. Cela concerne :
- `Layout.tsx` (ligne 98)
- `LoadingScreen.tsx` (supprimer l'overlay div du pattern, lignes 79-87)
- Toutes les pages : `Index.tsx`, `Messages.tsx`, `Feed.tsx`, `Leaderboard.tsx`, `MySessions.tsx`, `Profile.tsx`, `Search.tsx`, `Auth.tsx`, `About.tsx`, `Subscription.tsx`, `PublicProfile.tsx`, `NotFound.tsx`, `RouteCreation.tsx`
- Tous les composants : `SettingsDialog.tsx`, `ProfileDialog.tsx`, `ProfilePreviewDialog.tsx`, `ProfileSetupDialog.tsx`, `OnboardingDialog.tsx`, `HelpDialog.tsx`, `CreateSessionWizard.tsx`, `SettingsGeneral.tsx`, `SettingsNotifications.tsx`, `SettingsPrivacy.tsx`, `SettingsSupport.tsx`, `SettingsConnections.tsx`
- `useConversationTheme.tsx` (supprimer `bg-pattern` des themes de conversation)

### 2. Remplacer `bg-secondary` par `bg-background` sur les fonds de page

Sur toutes les pages qui utilisent `bg-secondary` comme fond principal, remplacer par `bg-background`. Cela aligne le fond de page avec la couleur native WKWebView.

Pages concernees :
- `Feed.tsx` : `bg-secondary` -> `bg-background`
- `Messages.tsx` (liste conversations) : `bg-secondary` -> `bg-background`
- `Leaderboard.tsx` : `bg-secondary` -> `bg-background`
- `MySessions.tsx` : `bg-secondary` -> `bg-background`
- `Profile.tsx` : `bg-secondary` -> `bg-background`
- `Search.tsx` : `bg-secondary` -> `bg-background`
- `Auth.tsx` : `bg-secondary` -> `bg-background`
- `About.tsx` : `bg-secondary` -> `bg-background`
- `Subscription.tsx` : `bg-secondary` -> `bg-background`
- `PublicProfile.tsx` : `bg-secondary` -> `bg-background`
- `NotFound.tsx` : `bg-secondary` -> `bg-background`
- `LoadingScreen.tsx` : `bg-secondary` -> `bg-background`

### 3. Simplifier la gestion des couleurs iOS

**`Layout.tsx`** : Simplifier le `useEffect` pour que `--ios-top-color` soit toujours `hsl(var(--background))` sur toutes les pages (plus de conditions par route). Supprimer les lignes qui forcent `backgroundColor` en inline puisque le CSS fait deja le travail.

**`LoadingScreen.tsx`** : Supprimer le `useEffect` de couleur WKWebView (lignes 24-33) -- le fond sera `bg-background` comme partout.

**`Search.tsx`** : Supprimer le `useEffect` de couleur WKWebView (lignes 49-59).

**`Messages.tsx`** : Supprimer la logique de changement de couleur WKWebView dans le `useEffect` (lignes 206-220). Garder uniquement `setHideBottomNav`.

### 4. Nettoyer le CSS

**`src/index.css`** :
- Ligne 167 : remplacer `#1d283a !important` par `hsl(var(--background)) !important` pour que le fond soit toujours aligne sur le token.
- Ligne 450 : simplifier `--ios-top-color` default a `hsl(var(--background))` (deja fait).
- Supprimer la ligne `body::before` n'est pas necessaire vu qu'elle utilise deja le bon fallback.

## Resultat attendu

- **Status bar** : meme couleur que le contenu (`--background`)
- **Home indicator / WKWebView** : meme couleur que le contenu (`--background`)
- **Toutes les pages** : fond uniforme `bg-background`
- **Pas de pattern sportif** : design epure, classe mondiale type Strava/Instagram
- **Cards et headers** : restent en `bg-card` pour creer la hierarchie visuelle sur le fond `bg-background`

## Nombre de fichiers impactes

Environ 30+ fichiers pour retirer `bg-pattern` et remplacer `bg-secondary` -> `bg-background`.
