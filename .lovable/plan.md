
# Corriger la bande visible sous la Status Bar sur la page Accueil

## Cause du probleme

Le header de la carte utilise `bg-card/95` (couleur card a 95% d'opacite avec backdrop-blur), tandis que la zone Status Bar utilise `hsl(var(--card))` (100% opaque, sans motif sportif). Cette difference d'opacite + l'absence du motif cree une legere difference de teinte visible.

## Solution

Rendre le fond du header completement opaque pour qu'il corresponde exactement a la couleur de la Status Bar.

### Fichier : `src/components/InteractiveMap.tsx` (ligne 1381)

Remplacer :
```
bg-card/95 backdrop-blur-sm
```
Par :
```
bg-card
```

Le `backdrop-blur-sm` et l'opacite a 95% n'apportent rien visuellement en haut de page (il n'y a pas de contenu derriere le header a cet endroit). En passant a `bg-card` opaque, la couleur sera strictement identique a `hsl(var(--card))` defini dans `--ios-top-color`.

## Ce qui ne change pas

- Aucune modification de position ou de padding
- Aucune modification de la safe area
- Aucune modification du layout
- Les icones, le titre, l'avatar restent identiques
- Le motif sportif (`bg-pattern`) reste present sur le header

## Fichier modifie

| Fichier | Changement |
|---------|-----------|
| `src/components/InteractiveMap.tsx` | Ligne 1381 : `bg-card/95 backdrop-blur-sm` remplace par `bg-card` |
