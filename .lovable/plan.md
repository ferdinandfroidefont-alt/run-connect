

## Probleme

Le R actuel est un simple trait SVG stroke — ca ne ressemble pas du tout au logo officiel qui a une forme organique, epaisse, avec un effet 3D/gradient et des courbes fluides specifiques.

Reproduire cette forme complexe avec un `strokeWidth` sur un path est impossible — le logo a des epaisseurs variables, des reflets, et une geometrie tres specifique.

## Solution

Utiliser **l'image du logo officiel** comme etat final revele, et garder l'animation de trace (trait fin + point lumineux) uniquement pour la phase d'animation.

1. **Copier le logo uploade** dans `src/assets/runconnect-r-logo.png`
2. **Phase trace** : garder le trait fin anime actuel (leading dot + glow trail) — ca reste visuellement premium
3. **Phase reveal** : au lieu d'epaissir le stroke, faire un **crossfade** du trait vers l'image du vrai logo par-dessus, avec un scale-up subtil
4. **Pin GPS** : integre dans l'image du logo, donc pas besoin de le dessiner separement en phase reveal
5. **Shimmer** : appliquer le light sweep par-dessus l'image du logo

### Flux visuel
```text
appear:     pin GPS drop au point de depart
trace:      point lumineux trace le R en trait fin (1s)
reveal:     trait fin fade out + image logo fade in (0.3s) + shimmer
exit:       logo + texte montent et fade out
```

### Fichiers modifies
- `src/assets/runconnect-r-logo.png` — copie du logo uploade
- `src/components/LoadingScreen.tsx` — import de l'image, crossfade du stroke vers l'image en phase reveal

