

# Refonte LoadingScreen — Le tracé EST le logo

## Problème actuel
Phase 2 trace un "R" générique, puis Phase 3 le **remplace** par une `<img>` du vrai logo PNG. Deux éléments visuels distincts = transition cassée.

## Solution
Supprimer complètement l'`<img>` du logo. Recréer le logo RunConnect entièrement en SVG paths. L'animation trace ces paths progressivement. Le résultat final du tracé = le logo. Zéro remplacement.

## Architecture SVG du logo
Le logo RunConnect est une icône d'app : carré arrondi bleu avec un design intérieur (silhouette runner/route). On le décompose en :
1. **Path 1** — Le carré arrondi extérieur (le fond bleu de l'icône)
2. **Path 2** — Le design intérieur blanc (la figure/route à l'intérieur)

Les deux sont dessinés via `stroke-dashoffset` animation, puis le fill apparaît en fondu.

## Timeline d'animation

```text
0ms       350ms      1200ms       1600ms      ~3400ms
|--pin----|--trace----|--fill+glow--|--loading--|
 scale-in  dashoffset   fill opacity  progress bar
           sur paths    + light sweep + phrases
```

## Phases

1. **Pin (0-350ms)** — Pin GPS bleu, scale spring, pulse ring (inchangé)
2. **Trace (350-1200ms)** — Les SVG paths du logo se tracent via `strokeDashoffset`. D'abord le contour arrondi, puis le design intérieur. Un point lumineux suit le tracé.
3. **Fill + Glow (1200-1600ms)** — Les paths se remplissent (`fill-opacity: 0 → 1`, `stroke-opacity: 1 → 0`). Glow `drop-shadow` apparaît. Light sweep traverse.
4. **Loading (1600ms+)** — Texte "RUNCONNECT" + barre de progression + phrases dynamiques sous le logo SVG (qui reste affiché).

## Changement clé
- **Supprimé** : `import runconnectLogo` + `<img src={runconnectLogo}>` 
- **Ajouté** : Composant SVG inline qui dessine le logo complet
- Le logo en phase 3/4 est le MÊME SVG que phase 2, juste avec fill activé
- Plus de `AnimatePresence` entre trace et logo — c'est un seul élément continu

## Fichier impacté
| Fichier | Changement |
|---------|-----------|
| `src/components/LoadingScreen.tsx` | Refonte complète — SVG logo tracé puis rempli, suppression de l'image PNG |

