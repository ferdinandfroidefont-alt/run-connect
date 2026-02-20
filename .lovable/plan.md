

# Correction couleurs Status Bar et Home Indicator sur l'ecran de chargement

## Probleme identifie

L'ecran de chargement utilise `bg-secondary` comme fond (variable CSS `--secondary`), mais les variables iOS pour la Status Bar et le Home Indicator sont reglees sur `hsl(var(--card))` -- une couleur differente. Cela cree une bande visible en haut et en bas qui rompt la continuite visuelle.

## Correction

Un seul fichier a modifier : `src/components/LoadingScreen.tsx`

Changer les deux lignes du `useEffect` (lignes 25-26) pour utiliser `hsl(var(--secondary))` au lieu de `hsl(var(--card))` :

```
--ios-top-color: hsl(var(--secondary))
--ios-bottom-color: hsl(var(--secondary))
```

Cela aligne parfaitement la couleur des zones systeme (Status Bar en haut, Home Indicator en bas) avec le fond de l'ecran de chargement.

## Ce qui ne change pas

- Aucune modification de position
- Aucun mode immersif
- Aucun changement de structure ou de layout
- Seule la valeur de couleur est ajustee pour correspondre au fond existant

## Fichier modifie

| Fichier | Changement |
|---------|-----------|
| `src/components/LoadingScreen.tsx` | Remplacer `hsl(var(--card))` par `hsl(var(--secondary))` dans le useEffect (2 lignes) |

