

## Plan: Remplacer le SVG du LoadingScreen par le nouveau design Runconnect

### Nouveau design
Le SVG fourni utilise un viewBox `0 0 1024 1536` avec :
- **Globe** : cercle à (512, 650) r=350, dégradé radial `#A0D8FF` → `#0D47A1`
- **Lettre R stylisée** : path englobant le globe, dégradé linéaire `#4FC3F7` → `#0052A4`
- **Marqueur GPS** : pion à ~(480, 1250) avec cercle blanc intérieur
- **Ombre portée** : filtre dropShadow sur globe et R
- **Fond blanc** `#FFFFFF`

### Changements dans `src/components/LoadingScreen.tsx`

1. **Remplacer les constantes SVG** :
   - `CHEMIN_R` → nouveau path R (`M 180,550 C 350,150 ...`)
   - `CONTINENTS` → supprimé (plus de continents verts, le globe est uni avec dégradé)
   - `MARQUEUR` → nouveau path pion (`M 420,1200 C 400,1150 ...`) + cercle blanc à (500, 1225) r=35
   - `ETOILE` → supprimé (pas d'étoile dans le nouveau SVG)

2. **Mettre à jour viewBox et dimensions** :
   - `SVG_W = 1024`, `SVG_H = 1536`
   - Container ratio ajusté (~220px large, ~330px haut pour respecter le ratio 2:3)

3. **Mettre à jour les dégradés/defs** :
   - `globeGrad` : radial `#A0D8FF` → `#0D47A1`
   - `rGrad` : linéaire `#4FC3F7` → `#0052A4`
   - `dropShadow` : feDropShadow dx=0 dy=30 stdDeviation=30
   - Supprimer `grad_terre_mer`, `grad_chemin_r`, `grad_marqueur`

4. **Mettre à jour les éléments SVG rendus** :
   - Globe : `<circle cx="512" cy="650" r="350" fill="url(#globeGrad)">`
   - R : nouveau path avec `fill="url(#rGrad)"`
   - Marqueur : nouveau path + cercle blanc
   - Supprimer étoile et continents

5. **Adapter les animations** :
   - Le tracé progressif suit le nouveau path R (plus grand, forme différente)
   - Le marqueur GPS bounce à sa nouvelle position (420, 1200)
   - Le globe fade-in reste identique mais centré sur (512, 650)
   - Fond changé en `#FFFFFF`

6. **Texte RUNCONNECT** : dégradé mis à jour avec les nouvelles couleurs (`#4FC3F7` → `#0052A4`)

### Fichier modifié
- `src/components/LoadingScreen.tsx`

