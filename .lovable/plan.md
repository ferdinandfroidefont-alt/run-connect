

## Corriger la transition trace → logo

### Probleme actuel
Le trace SVG fade out pendant que l'image fade in — ca donne l'impression de deux animations distinctes collees ensemble. L'utilisateur veut une animation **continue** ou le trait fin se "remplit" pour devenir le logo.

### Solution
Garder le meme fichier `src/components/LoadingScreen.tsx`, mais changer la logique de transition :

1. **Ne PAS faire disparaitre le trait SVG au reveal** — il reste visible
2. **Superposer l'image du logo exactement par-dessus le trait** avec un fade-in doux (pas de scale-up brusque)
3. **L'image commence a apparaitre avant meme que le trait ne soit fini** (overlap) — vers 80% du trace, l'image commence son fade-in a faible opacite
4. **Le trait s'epaissit progressivement** pendant les derniers 20% du trace (strokeWidth 4 → 12) pour visuellement "se remplir"
5. **Le fade-in de l'image se termine quand le stroke est a son maximum** — transition invisible

### Flux visuel corrige
```text
0-200ms     pin GPS drop
200-1000ms  point lumineux trace le R (trait fin)
800-1200ms  trait s'epaissit progressivement + image logo fade in par-dessus (OVERLAP)
1200-1500ms logo image 100% visible, shimmer, texte RUNCONNECT
1500-1700ms tout monte + fade out
```

### Changements concrets dans LoadingScreen.tsx
- Supprimer le `animate={isRevealed ? { opacity: 0 }` sur le SVG layer — le trait reste
- Pendant le trace, interpoler `strokeWidth` de 4 a 14 sur les derniers 20% de progression
- Demarrer le fade-in de l'image logo a `traceProgress > 0.8` au lieu d'attendre la phase `reveal`
- L'image utilise `opacity: Math.min((traceProgress - 0.8) * 5, 1)` pendant le trace, puis 1 en reveal
- Pas de `scale: 0.92` — l'image doit etre a sa taille finale des le depart pour s'aligner avec le trait
- Le shimmer ne commence qu'une fois l'image a opacity 1

### Resultat
Le spectateur voit : un point trace un R → le R s'epaissit → il devient le logo complet. Une seule animation fluide, pas de "coupure" entre trait et image.

