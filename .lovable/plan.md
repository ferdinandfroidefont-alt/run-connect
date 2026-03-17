

## Plan: Remplacer l'icône de l'app et simplifier l'écran de chargement

### 1. Copier la nouvelle icône
- Copier `user-uploads://IMG_7394.png` vers `src/assets/app-icon.png` (remplace l'existant)
- Copier aussi vers `public/favicon.png` pour le favicon

### 2. Réécrire `src/components/LoadingScreen.tsx`
Supprimer toute l'animation vectorielle SVG (layers, trace path, pin GPS, shimmer, etc.) et la remplacer par un composant simple :
- Fond blanc
- L'image `app-icon.png` centrée, taille ~170px (même espace visuel que l'animation actuelle)
- Le texte "RUNCONNECT" en dessous avec le même gradient bleu
- Fade-in simple de l'icône + texte
- Fade-out à la fin
- Garder la même durée totale (~1.7s) et le même `onLoadingComplete` callback

### 3. Mettre à jour `index.html`
- S'assurer que le favicon pointe vers `/favicon.png`

