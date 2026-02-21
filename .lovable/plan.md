

# Agrandir la barre de navigation vers le bas sur iOS

## Objectif

Etendre visuellement la barre de navigation vers le bas sur iOS pour couvrir completement la zone du Home Indicator, sans deplacer les boutons (Accueil, Mes Seances, +, Messages, Feed).

## Ce qui existe deja

La barre a deja `paddingBottom: env(safe-area-inset-bottom, 0px)` qui devrait etendre le fond. Cependant, sur certains appareils iOS, cela ne suffit pas visuellement.

## Modification

### `src/components/BottomNavigation.tsx`

Ajouter un padding supplementaire en bas (en plus du safe-area) specifiquement pour iOS, pour que la barre soit visuellement plus grande vers le bas :

- Remplacer le `paddingBottom` actuel par un calcul qui ajoute un espace fixe (ex: 8px) au safe-area inset :
  `paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)'`
- Cela agrandit la zone de fond de la barre vers le bas sans bouger les icones

### `src/index.css`

Dans le bloc `@supports (-webkit-touch-callout: none)` (styles iOS), ajouter une regle pour que le `html` et `body` aient un `background-color` qui correspond au theme, afin que la transition entre la barre et le bord de l'ecran soit parfaite meme si le safe-area ne couvre pas tout :

```text
@supports (-webkit-touch-callout: none) {
  html {
    background-color: hsl(var(--background)) !important;
  }
}
```

## Resultat attendu

La barre de navigation sera visuellement plus haute vers le bas sur iOS. Les boutons restent a la meme position. La couleur de fond de la barre couvre toute la zone jusqu'au bord inferieur de l'ecran.

