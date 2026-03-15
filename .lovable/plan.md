

## Refonte de l'animation de chargement RunConnect

### Objectif
Recréer le `LoadingScreen.tsx` avec un R fidèle au logo officiel (image fournie) et une animation plus fluide et premium en 1.7s.

### Analyse du logo officiel
Le R officiel est très différent du path actuel :
- C'est une courbe fluide type "route" — pas un R typographique avec des segments droits
- Départ en bas-gauche (pin GPS), monte en courbe vers la droite
- Swoope vers la gauche en haut, puis revient en courbe large vers la droite
- La jambe descend en courbe fluide vers le bas-droite
- Effet de volume/3D avec un dégradé bleu profond → bleu clair + reflets lumineux aux extrémités

### Changements prévus

**Fichier unique** : `src/components/LoadingScreen.tsx`

1. **Nouveau R_PATH** — Redessin complet en courbes de Bézier pour reproduire la forme fluide du logo officiel (swoopy road shape)

2. **Phases simplifiées** (durée totale ~1.7s) :
   - `appear` (0-200ms) : point lumineux apparaît au départ du tracé
   - `trace` (200ms-1200ms) : le point lumineux avance et dessine le R progressivement avec un trail glow
   - `reveal` (1200ms-1500ms) : le tracé se transforme en logo complet (épaisseur + gradient final), effet shimmer traverse la courbe
   - `pulse-exit` (1500ms-1700ms) : pin GPS pulse, logo monte légèrement, fade out vers l'app

3. **Effets visuels** :
   - Point lumineux blanc/cyan qui précède le tracé (leading dot)
   - Trail glow derrière le point (3 couches : blur large, blur moyen, trait net)
   - Transition du trait fin → épaisseur finale du logo
   - Shimmer light sweep sur la courbe du R
   - Pin GPS avec pulsation subtile à la fin
   - Le tout monte de ~20px et fade pour la transition

4. **Style** :
   - Fond blanc pur
   - Gradient bleu identique au logo : `#0044CC` → `#0088FF` → `#33BBFF`
   - Reflets lumineux cyan aux extrémités des courbes
   - Pas de barre de progression ni de phrases (animation trop courte)
   - Texte "RUNCONNECT" apparaît pendant le reveal

### Détails techniques
- Utilise `requestAnimationFrame` + `getPointAtLength` pour le tracé (existant, optimisé)
- `strokeDasharray/offset` pour le dessin progressif
- `framer-motion` pour le pin drop, shimmer, et transition finale
- Le leading dot est un cercle SVG positionné au point courant du path avec un filtre glow
- Durée totale contrôlée : `TRACE_DURATION = 1.0s`, phases avant/après ~350ms chacune

