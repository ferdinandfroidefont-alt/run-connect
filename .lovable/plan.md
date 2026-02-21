

# Corriger la couleur de la Status Bar (body::before)

## Probleme

Le pseudo-element `body::before` (Status Bar iOS en haut) utilise `background-blend-mode: overlay` avec le motif sportif (`sports-pattern.png`). Ce blend mode melange la couleur de fond avec le motif et produit une couleur resultante **differente** de celle du header juste en dessous. C'est exactement le meme probleme que celui qu'on a corrige pour le Home Indicator (bas).

Cela affecte :
- La page d'accueil (`/`) : le header de la carte est `bg-card`, la Status Bar devrait etre identique mais le blend mode altere la teinte.
- La page de chargement (LoadingScreen) : le fond est `bg-secondary`, la Status Bar devrait etre identique.

## Solution

### Fichier : `src/index.css`

Supprimer `background-image`, `background-repeat`, `background-size` et `background-blend-mode` du pseudo-element `body::before` (lignes 451-454). On garde uniquement `background-color` pour que la Status Bar soit une couleur unie, parfaitement dans la continuite du header en dessous.

Avant :
```text
body::before {
  content: '';
  display: block;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: env(safe-area-inset-top, 0px);
  background-color: var(--ios-top-color, hsl(var(--background)));
  background-image: url('/patterns/sports-pattern.png');
  background-repeat: repeat;
  background-size: 200px 200px;
  background-blend-mode: overlay;
  z-index: 9999;
  pointer-events: none;
}
```

Apres :
```text
body::before {
  content: '';
  display: block;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: env(safe-area-inset-top, 0px);
  background-color: var(--ios-top-color, hsl(var(--background)));
  z-index: 9999;
  pointer-events: none;
}
```

### Fichier : `src/components/LoadingScreen.tsx`

Supprimer la ligne 26 (`--ios-bottom-color`) car `body::after` n'existe plus. On garde la ligne 25 (`--ios-top-color`) pour la Status Bar.

Aucun fichier cree. Aucune position changee. On retire le motif qui causait le decalage de couleur, exactement comme pour le Home Indicator.

