

# Supprimer la bande visible sous la Status Bar - Page Accueil

## Cause racine

Le pseudo-element `body::before` (qui colore la zone de la Status Bar) applique une couleur plate `hsl(var(--card))` a `z-index: 9999`. Juste en dessous, le header de la carte utilise la meme couleur `bg-card` MAIS avec le motif sportif (`bg-pattern`) qui ajoute un leger dessin en overlay. Le pseudo-element opaque recouvre le haut du header, creant une demarcation entre la zone plate (Status Bar) et la zone avec motif (header).

## Solution

Ajouter le meme motif sportif au pseudo-element `body::before` pour que la zone Status Bar ait exactement le meme rendu visuel que le header en dessous.

### Fichier : `src/index.css`

Ajouter une regle `body::before` qui replique le motif sportif avec la meme opacite que `.bg-pattern::before` :

Actuellement (lignes 442-453) :
```css
body::before {
  content: '';
  display: block;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: env(safe-area-inset-top, 0px);
  background-color: var(--ios-top-color, #1d283a);
  z-index: 9999;
  pointer-events: none;
}
```

Apres :
```css
body::before {
  content: '';
  display: block;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: env(safe-area-inset-top, 0px);
  background-color: var(--ios-top-color, #1d283a);
  background-image: url('/patterns/sports-pattern.png');
  background-size: 200px 200px;
  background-repeat: repeat;
  z-index: 9999;
  pointer-events: none;
}
.dark body::before {
  background-blend-mode: overlay;
}
:not(.dark) body::before {
  background-blend-mode: overlay;
}
```

Cela reprend exactement le meme motif que `.bg-pattern::before` avec la meme opacite visuelle, en le superposant a la couleur de fond. La zone Status Bar aura ainsi le meme rendu que le header : couleur `--card` + motif sportif = bloc visuel unique.

## Ce qui ne change pas

- Aucune modification de position ou de taille de la Status Bar
- Aucune modification de padding ou de safe area
- Aucune modification du layout ou des composants
- La bottom bar et le Home Indicator ne sont pas touches
- Le header reste identique

## Fichier modifie

| Fichier | Changement |
|---------|-----------|
| `src/index.css` | Ajout du motif sportif sur `body::before` pour correspondre au header |

