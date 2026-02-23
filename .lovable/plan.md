

## Corriger l'appui long qui ne fonctionne pas

### Probleme

L'appui long sur un message ne declenche pas le menu car il utilise uniquement les evenements tactiles (`onTouchStart`/`onTouchEnd`). Ces evenements ne se declenchent pas sur un navigateur desktop avec une souris.

### Solution

Ajouter les evenements souris (`onMouseDown`, `onMouseUp`, `onMouseLeave`) en parallele des evenements tactiles sur la div qui entoure chaque bulle de message (ligne ~1849 de `src/pages/Messages.tsx`).

### Detail technique

Ajouter 3 handlers souris sur le meme `<div>` qui contient deja les handlers tactiles :

- `onMouseDown` : demarre le timer de 500ms (meme logique que `onTouchStart`)
- `onMouseUp` : annule le timer (meme logique que `onTouchEnd`)
- `onMouseLeave` : annule le timer (au cas ou la souris sort de la zone)

Les handlers tactiles existants restent en place pour le fonctionnement sur mobile.

### Fichier concerne

- `src/pages/Messages.tsx` (ajout de 3 props sur la div ligne ~1849)

