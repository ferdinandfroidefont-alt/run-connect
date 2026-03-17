

## Plan: Remplacer l'animation de chargement par le nouveau SVG globe/R

### Concept
Remplacer le logo R multi-couches actuel par le nouveau SVG "globe terrestre + chemin R + marqueur GPS + étoile". Conserver la mécanique d'animation existante (phases appear → trace → reveal → exit) en l'adaptant aux nouveaux éléments.

### Animation adaptée au nouveau SVG

1. **Phase "appear"** — Le marqueur GPS (`marqueur_position`) tombe avec un spring bounce à sa position (168, 362)
2. **Phase "trace"** — Le chemin R (`chemin_r`) se dessine progressivement via strokeDasharray/offset, un point lumineux suit le tracé. Le globe (`terre` + `continents`) se révèle en parallèle avec un fade-in + scale
3. **Phase "reveal"** — Tout est visible, shimmer sweep + étoile pulse
4. **Phase "exit"** — Fade out vers le haut

### Changements dans `src/components/LoadingScreen.tsx`

- **Supprimer** les constantes LAYER_1–5 et l'ancien TRACE_PATH
- **Nouveau TRACE_PATH** : basé sur le `chemin_r` du SVG (le path en forme de R), converti en centerline pour le dash animation
- **Nouveau viewBox** : `0 0 512 512` (comme le SVG fourni)
- **Nouveaux éléments SVG** :
  - Globe (cercle gradient radial + continents) — masqué par le reveal progressif
  - Chemin R (path gradient linéaire) — tracé progressivement
  - Étoile (en haut) — apparaît au reveal avec un pulse
  - Marqueur GPS — animation spring à l'appear
- **Gradients/defs** : reprendre les `grad_terre_mer`, `grad_chemin_r`, `grad_marqueur` du SVG fourni
- **Fond** : passer de `#FFFFFF` à `#f7f9fc`
- **Taille container** : ajuster à ~220x220 (carré, ratio 1:1 du nouveau SVG)
- **Texte RUNCONNECT** : conservé en dessous, même style

### Fichier modifié
- `src/components/LoadingScreen.tsx` — réécriture complète du contenu SVG et adaptation des animations

