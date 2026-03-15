

## Refonte complète : R vectoriel animé (sans image PNG)

### Concept
Utiliser directement les paths SVG du R officiel (les 5 couches de couleur fournies) comme état final. L'animation trace un chemin central simplifié, et un **masque SVG** (clipPath) progressif révèle les couches remplies du vrai R au fur et à mesure.

Le spectateur voit : un point lumineux trace une route → la route "s'épaissit" et révèle le vrai R multi-couches → shimmer + texte RUNCONNECT → exit.

### Approche technique

**Fichier unique** : `src/components/LoadingScreen.tsx`

1. **Supprimer l'import PNG** — plus besoin de `runconnect-r-logo.png`

2. **Intégrer les 5 couches SVG** du R officiel directement dans le composant (les paths fournis avec fills `#dce8f8`, `#b9d1f1`, `#67abf8`, `#2072f7`, `#1244d4`)

3. **Chemin central simplifié** (`TRACE_PATH`) — une courbe de Bézier qui suit le centre géométrique du R, utilisée pour :
   - Le `strokeDasharray/offset` du tracé animé
   - Le positionnement du leading dot via `getPointAtLength`
   - Le **masque de révélation** (même path avec un `strokeWidth` très large qui s'élargit progressivement)

4. **Masque SVG progressif** :
   - Un `<mask>` contenant le TRACE_PATH avec un stroke blanc épais
   - Le `strokeDashoffset` diminue avec `traceProgress` → révèle progressivement
   - Le `strokeWidth` du masque augmente de ~20 à ~400 (couvre tout le R à 100%)
   - Les 5 couches du R sont à l'intérieur de ce masque

5. **Phases** (durée totale ~1.7s) :
   - `appear` (0-200ms) : pin GPS drop au départ
   - `trace` (200-1200ms) : leading dot + trait fin + masque qui révèle le R progressivement
   - `reveal` (1200-1500ms) : R complet visible, shimmer traverse les couches
   - `exit` (1500-1700ms) : monte + fade out

6. **Effets finaux** (un peu visibles) :
   - Shimmer light sweep sur le R
   - Léger glow autour du R pendant reveal
   - Texte "RUNCONNECT" fade in

### ViewBox
Le SVG fourni utilise `viewBox="0 0 440 340"`. Le composant affichera le SVG à une taille adaptée (~220x170 CSS pixels pour le viewport 320px).

### Résultat
Zéro image PNG. Le R final EST le vrai logo vectoriel multi-couches. L'animation et le résultat final sont une seule et même chose — pas de "swap" ni de crossfade.

