

# Correction couleurs iOS - Etape par etape

## Probleme

La variable `--ios-bottom-color` est definie en JS mais **aucun element CSS ne l'utilise** : le `body::after` a ete supprime precedemment. Il faut le remettre.

De plus, la page Recherche a `--ios-top-color` en `#1d283a` alors qu'elle devrait etre grise avec motif sportif (comme la page de chargement).

## Corrections (couleurs seulement, pas de changement de position)

### 1. `src/index.css` -- Ajouter `body::after` pour le Home Indicator

Dans le bloc `@supports (-webkit-touch-callout: none)`, juste apres le `body::before` existant, ajouter :

```css
body::after {
  content: '';
  display: block;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: env(safe-area-inset-bottom, 0px);
  background-color: var(--ios-bottom-color, #1d283a);
  z-index: 9999;
  pointer-events: none;
}
```

C'est lui qui affichera la couleur du Home Indicator. Sans cet element, la variable `--ios-bottom-color` n'a aucun effet.

### 2. `src/pages/Search.tsx` -- Corriger la couleur du haut

Actuellement : `--ios-top-color` = `#1d283a` (bleu fonce).
Correction : `--ios-top-color` = `hsl(var(--card))` (gris avec motif sportif, pareil que la page de chargement).

Le bas reste `hsl(var(--card))` -- c'est deja correct.

### 3. Pas de changement sur les autres fichiers

- `Layout.tsx` : les regles sont correctes (accueil = card en haut, messages = secondary en bas, reste = #1d283a).
- `LoadingScreen.tsx` : deja correct (haut et bas = `hsl(var(--card))`).

## Resume

| Fichier | Changement |
|---------|-----------|
| `src/index.css` | Ajouter `body::after` avec `var(--ios-bottom-color)` |
| `src/pages/Search.tsx` | Changer `--ios-top-color` de `#1d283a` a `hsl(var(--card))` |

