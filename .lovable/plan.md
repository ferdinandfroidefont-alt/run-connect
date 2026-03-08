

# Refonte LoadingScreen — Logo R cursif fidèle à l'image

## Probleme actuel
Le logo actuel est un **carré arrondi bleu avec un R blocky à l'intérieur** (style icône d'app). Le vrai logo RunConnect est un **R cursif fluide** avec un pin GPS en bas à gauche, sans aucun carré extérieur. Totalement différent.

De plus, l'animation du pin (phase 1) a été affaiblie — il faut la restaurer avec le spring bounce + pulse ring.

## Ce qu'il faut changer

### 1. Nouveau SVG — R cursif fluide
Remplacer les paths `OUTER_PATH` (carré arrondi) et `INNER_PATH` (R blocky) par un **seul path principal** qui dessine la forme exacte du logo :
- Départ en bas à gauche (position du pin GPS)
- Courbe qui monte en arc vers le haut-droite (premier sweep)
- Boucle qui revient former le haut du R
- Trait diagonal vers le bas-droite (jambe du R)

Le path utilise des courbes de Bézier cubiques pour reproduire les courbes fluides du logo.

### 2. Pin GPS intégré au logo
Le pin n'est plus un élément séparé qui disparaît — il fait partie du SVG final. Il est positionné au point de départ du tracé (bas-gauche). Pendant phase 1 il apparaît seul, puis le tracé démarre depuis lui.

### 3. Glow bleu clair
Deux layers du même path :
- Layer 1 : stroke bleu clair (`#60A5FA`) avec blur 4px — effet glow
- Layer 2 : stroke bleu foncé (`#2563EB`) net — trait principal
- Gradient le long du stroke pour l'effet dégradé bleu foncé → bleu clair visible dans l'image

### 4. Pas de carré, pas de fill
Le logo final est un **tracé ouvert** (stroke only), pas un carré rempli. Pas de `fill` sur le R.

### 5. Timeline restaurée
- **Pin (0-400ms)** : Pin GPS apparaît avec spring bounce + pulse ring (comme avant, restauré)
- **Trace (400-1300ms)** : Le R se trace depuis le pin via `strokeDashoffset`
- **Glow (1300-1600ms)** : Light sweep traverse le tracé, glow s'intensifie
- **Loading (1600ms+)** : "RUNCONNECT" + barre de progression + phrases

## Fichier impacté
| Fichier | Changement |
|---------|-----------|
| `src/components/LoadingScreen.tsx` | Refonte SVG paths, pin restauré, suppression carré arrondi |

