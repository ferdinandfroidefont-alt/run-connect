

# Ajustement du R cursif — Fidélité à l'image de référence

## Constat
L'animation (pin → tracé → glow → loading) est validée par l'utilisateur. Le seul problème : la forme du R cursif n'est pas assez fidèle à l'image de référence. Il faut ajuster le SVG path.

## Ce qui change

### Path SVG du R
Le path actuel dessine un R trop compact avec des courbes trop serrées. D'après l'image de référence (IMG_7123), le R doit avoir :
- Une **montée verticale plus haute et plus droite** depuis le pin (tige du R plus marquée)
- Une **boucle/bowl plus large et plus arrondie** en haut à droite  
- Une **jambe diagonale plus prononcée** qui descend vers le bas-droite
- Un style plus **calligraphique/script** avec des courbes plus amples et fluides
- Le tout doit occuper plus d'espace horizontal

### Ajustements concrets
- Agrandir le viewBox (ex: 160×200) pour donner plus d'espace
- Réécrire les courbes de Bézier : tige plus haute, bowl plus large, jambe plus longue
- Recalculer `R_PATH_LENGTH` en conséquence
- Ajuster la position du pin pour rester cohérent avec le départ du path

## Timeline / Animation
Aucun changement — seule la géométrie du path est modifiée.

## Fichier impacté
| Fichier | Changement |
|---------|-----------|
| `src/components/LoadingScreen.tsx` | Nouveau `R_PATH` avec courbes ajustées, viewBox élargi |

