

# Continuity visuelle Status Bar et Home Indicator - Page de chargement

## Probleme identifie

La page de chargement (LoadingScreen) utilise un fond `bg-secondary` avec le motif sportif en overlay a 6% d'opacite. La Status Bar (`body::before`) recoit bien `hsl(var(--secondary))` comme couleur, et depuis la derniere correction elle affiche aussi le motif sportif. Cependant :

1. **Le motif est rendu differemment** : `body::before` utilise `background-blend-mode: overlay` tandis que le LoadingScreen utilise `opacity: 0.06`. Le rendu visuel peut differer.
2. **Il n'existe pas de `body::after`** pour le Home Indicator (bas de l'ecran). La variable `--ios-bottom-color` est definie mais aucune regle CSS ne la consomme. Il faut la creer.

## Solution

### 1. Ajouter `body::after` pour le Home Indicator

Creer un pseudo-element `body::after` dans `src/index.css` (dans le bloc `@supports (-webkit-touch-callout: none)`) qui colore la zone du Home Indicator exactement comme `body::before` colore la Status Bar, avec le meme motif sportif.

### 2. S'assurer que la texture est coherente

Le `body::before` et `body::after` utiliseront tous les deux `background-blend-mode: overlay` sur la couleur de fond + motif. Cela correspond bien au rendu du LoadingScreen puisque la couleur `--secondary` avec overlay produit un rendu quasi identique a l'opacite 6%.

## Changements concrets

### Fichier : `src/index.css`

Apres le bloc `body::before` existant (apres la ligne 462), ajouter :

```css
  body::after {
    content: '';
    display: block;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: env(safe-area-inset-bottom, 0px);
    background-color: var(--ios-bottom-color, hsl(var(--background)));
    background-image: url('/patterns/sports-pattern.png');
    background-size: 200px 200px;
    background-repeat: repeat;
    z-index: 9999;
    pointer-events: none;
  }
  .dark body::after {
    background-blend-mode: overlay;
  }
  :not(.dark) body::after {
    background-blend-mode: overlay;
  }
```

## Ce qui ne change pas

- Aucune modification de position, padding ou safe area
- Aucune modification du LoadingScreen lui-meme
- Aucune modification du layout ou des composants
- La Status Bar (haut) garde son fonctionnement actuel
- Les couleurs dynamiques (`--ios-top-color`, `--ios-bottom-color`) continuent d'etre pilotees par chaque page/composant

## Fichier modifie

| Fichier | Changement |
|---------|-----------|
| `src/index.css` | Ajout de `body::after` pour le Home Indicator avec motif sportif et couleur dynamique |

