
## Plan: Remplacer les paths SVG par le fichier SVG officiel

### Analyse du fichier fourni
Le fichier `IMG_7414.svg` est un SVG haute fidelite de 925x732px avec ~480 paths individuels colores. C'est un trace vectoriel precis du logo R, beaucoup plus detaille que les 5 layers actuels.

### Approche
Impossible de copier les 480 paths dans des constantes JS -- trop volumineux et non structure en 5 couches. A la place, on va:

1. **Copier le SVG dans `public/`** comme `public/logo-r.svg`
2. **Remplacer les 5 `<path>` layers** par un seul element `<image>` SVG qui reference le fichier SVG
3. **Conserver tout le systeme d'animation** identique : mask, trace, dot, pin, shimmer, reveal, exit
4. **Adapter le viewBox** pour que l'image s'aligne correctement dans le cadre 440x340

### Ce qui ne change PAS
- Aucun timing, aucune phase, aucune logique d'animation
- Le TRACE_PATH reste identique
- Les filtres (shadow, glossy, dotGlow, pinS