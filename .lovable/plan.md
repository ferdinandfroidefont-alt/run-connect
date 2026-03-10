

# Plan: Pin trace le R comme un parcours GPS

## Concept

Le pin GPS devient l'élément actif qui "dessine" le R en se deplacant le long du path. La ligne apparait derriere lui comme une trace GPS.

## Approche technique

Réécrire `LoadingScreen.tsx` avec cette logique :

### 1. Pin qui suit le path SVG

Utiliser `<animateMotion>` sur le pin SVG lui-meme (pas un cercle séparé) pour qu'il se déplace le long de `R_PATH` pendant 2 secondes. Le pin est un groupe SVG (`<g>`) contenant le marker + un halo GPS animé.

### 2. Trace GPS derrière le pin

Synchroniser le `strokeDashoffset` de la ligne avec le mouvement du pin :
- `strokeDasharray={R_PATH_LENGTH}` 
- `initial={{ strokeDashoffset: R_PATH_LENGTH }}` → `animate={{ strokeDashoffset: 0 }}`
- Même durée (2s) et même easing (`linear`) que le pin pour que la trace suive exactement

### 3. Timeline révisée

| Phase | Durée | Action |
|-------|-------|--------|
| `pin-drop` | 0-0.4s | Pin apparait avec spring bounce + pulse GPS |
| `trace` | 0.4-2.4s | Pin se déplace, trace se dessine (2s, linear) |
| `complete` | 2.4-2.7s | Glow sweep, texte RUNCONNECT apparait |
| `loading` | 2.7s+ | Barre de progression + phrases |

### 4. Détails visuels

**Pin** : Même SVG pin actuel mais en tant que `<g>` dans le SVG principal avec :
- `<animateMotion dur="2s" path={R_PATH} rotate="auto" fill="freeze" />`
- Halo GPS : cercle avec `animate={{ scale: [1, 2], opacity: [0.4, 0] }}` en boucle pendant la trace

**Trace** : 3 layers conservés (glow blur + gradient principal + highlight) mais avec :
- Durée 2s au lieu de 0.85s
- Easing `linear` pour vitesse constante
- Démarrage synchronisé avec le pin

**Fin** : Pin reste à la position finale du path (grâce à `fill="freeze"`), texte apparait en fade

### 5. Changements dans le fichier

**Fichier**: `src/components/LoadingScreen.tsx`

- Supprimer le pin SVG séparé (lignes 98-115) et le pulse ring séparé (118-134)
- Intégrer le pin comme `<g>` à l'intérieur du SVG principal avec `<animateMotion>`
- Ajouter un cercle halo GPS qui pulse autour du pin pendant le tracé
- Ajuster les timeouts : pin-drop 0.4s, trace start 0.4s, complete 2.5s, loading 2.8s
- Changer durée trace de 0.85s à 2s
- Changer easing de `easeInOut` à `linear` pour vitesse constante
- Le "moving dot" (lignes 207-217) est remplacé par le pin lui-même

