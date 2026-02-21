

# Corriger la barre Home Indicator (bas) pour une continuité parfaite

## Probleme identifie

Le `body::after` (zone Home Indicator iOS) applique `background-blend-mode: overlay` avec le motif sportif. Ce blend mode melange la couleur de fond avec le motif, produisant une couleur resultante **differente** de celle du contenu juste au-dessus (barre de navigation ou page). C'est ce qui cree l'effet de "deuxieme barre" visible sur les captures.

Le `body::before` (Status Bar en haut) a le meme probleme potentiel, mais il est moins visible car les headers ont eux-memes le motif.

## Solution

### Fichier : `src/index.css`

**Modification du `body::after` (lignes 460-475)** : Supprimer `background-image`, `background-repeat`, `background-size` et `background-blend-mode` du pseudo-element `body::after`. On garde uniquement la couleur de fond unie (`background-color`) pour que le Home Indicator soit une simple extension de couleur, invisible et parfaitement dans la continuite.

Le `body::before` (Status Bar haut) reste inchange car le motif y fonctionne bien visuellement.

Aucune autre modification. Aucune barre creee, aucune position changee -- on retire juste le motif qui causait le decalage de couleur.

