

## Corriger la puce bleue sur la page Suivi d'itineraire

### Probleme identifie

La page d'accueil (InteractiveMap) utilise un marqueur cree via **Canvas 2D** (`canvas.toDataURL`) avec `google.maps.Marker` : un cercle bleu (`#3b82f6`) avec halo radiant et bordure blanche, taille 60x60px.

La page Suivi d'itineraire (TrainingMode) utilise `AdvancedMarkerElement` qui necessite un `mapId` enregistre dans la console Google Cloud. Sans cela, le marqueur ne s'affiche pas du tout. Le fallback `google.maps.Marker` avec `SymbolPath.CIRCLE` est trop petit pour etre visible.

### Solution

Reprendre exactement la meme methode que InteractiveMap : creer le marqueur via Canvas 2D avec `google.maps.Marker`.

### Modifications - Fichier `src/pages/TrainingMode.tsx`

1. **Remplacer `updateBlueDot`** : copier la methode `createPulsatingMarker()` de InteractiveMap qui dessine un canvas avec :
   - Gradient radial bleu (`rgba(59, 130, 246, ...)`)
   - Point central bleu solide (`#3b82f6`, rayon 8px)
   - Bordure blanche (3px)
   - Taille 60x60px

2. **Utiliser `google.maps.Marker`** au lieu de `AdvancedMarkerElement` :
   - `icon.url` = `canvas.toDataURL('image/png')`
   - `scaledSize` = 60x60
   - `anchor` = centre (30, 30)
   - `zIndex: 1000`

3. **Supprimer le try/catch AdvancedMarkerElement** : plus besoin de cette logique, on utilise directement `google.maps.Marker`

4. **Garder la mise a jour de position** : `markerRef.current.setPosition(pos)` quand la position GPS change

5. **Supprimer le CSS `@keyframes gm-pulse`** : plus utilise (l'animation est dans le canvas)

### Resultat attendu

La puce bleue sera visuellement identique a celle de l'ecran d'accueil : meme couleur, meme taille, meme halo.

