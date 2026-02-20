

# Suppression des barres systeme uniquement sur iOS

## Objectif
Supprimer toutes les barres visibles (status bar en haut, home indicator en bas) uniquement sur iOS. Android reste inchange avec ses barres noires actuelles.

## Modifications

### 1. `src/components/BottomNavigation.tsx`
- Supprimer le `paddingBottom: 'env(safe-area-inset-bottom, 0px)'` du style inline du `<nav>` -- cette propriete reserve de l'espace pour le home indicator iOS

### 2. `index.html`
- Supprimer la balise `<meta name="theme-color">` (elle affecte uniquement le rendu iOS/Safari)
- Conserver les meta tags `apple-mobile-web-app-capable` et `apple-mobile-web-app-status-bar-style: black-translucent` pour la fusion du contenu avec le notch

### 3. `src/index.css`
- Dans le bloc `@supports (-webkit-touch-callout: none)` (qui cible uniquement iOS), supprimer toute reference a `safe-area-inset-bottom` et `safe-area-inset-top` pour garantir zero espace reserve

### 4. Fichiers Android NON modifies
- `android/app/src/main/res/values/styles.xml` : inchange
- `android/app/src/main/res/values-v35/styles.xml` : inchange
- `android-webview/app/src/main/res/values/styles.xml` : inchange
- `android-webview/app/src/main/res/values-v35/styles.xml` : inchange

Les barres noires Android restent telles quelles. Seul le comportement iOS est modifie pour un affichage 100% bord a bord.

