

# Continuity visuelle Status Bar et Home Indicator - Page Accueil

## Probleme identifie

Les couleurs hardcodees `#1d283a` ne correspondent pas exactement a la variable CSS `--background` (`hsl(222 47% 11%)` en dark mode). Cela cree une legere difference de teinte visible entre :
- La zone de la Status Bar (haut) et le header de la carte
- La zone du Home Indicator (bas) et la bottom navigation bar

## Corrections dans `src/components/Layout.tsx`

Modifier le `useEffect` (lignes 20-38) pour utiliser les variables CSS dynamiques au lieu de `#1d283a` en dur :

**Status Bar (haut) pour la page Accueil :** deja correct (`hsl(var(--card))`), pas de changement.

**Home Indicator (bas) pour la page Accueil :** remplacer `#1d283a` par `hsl(var(--background))` pour correspondre exactement au `bg-background` de la `BottomNavigation`.

**Valeur par defaut pour toutes les pages :** remplacer `#1d283a` par `hsl(var(--background))` partout ou c'etait en dur, sauf les cas speciaux (messages = `hsl(var(--secondary))`, recherche = `hsl(var(--card))`).

### Changement concret (lignes 21-23)

Avant :
```
let topColor = '#1d283a';
let bottomColor = '#1d283a';
```

Apres :
```
let topColor = 'hsl(var(--background))';
let bottomColor = 'hsl(var(--background))';
```

Le reste de la logique conditionnelle (messages, accueil) ne change pas.

## Fichier modifie

| Fichier | Changement |
|---------|-----------|
| `src/components/Layout.tsx` | Remplacer `#1d283a` par `hsl(var(--background))` dans les valeurs par defaut du useEffect (2 lignes) |

## Ce qui ne change pas

- Aucune modification de position, padding, ou safe area
- Aucun changement sur les composants de la carte ou les boutons
- Aucun changement sur la BottomNavigation
- Le design general reste identique

