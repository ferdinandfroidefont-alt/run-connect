

## Corriger definitivement le bouton "Sondage"

### Probleme racine

Le `DropdownMenuItem` de Radix intercepte les evenements `onClick` de maniere interne. Quand on clique sur "Sondage", le dropdown se ferme mais le `setState` est soit annule, soit le re-render cause par la fermeture du dropdown ecrase le changement de state `showCreatePoll`.

Les autres items (Fichier, Photo, Emoji) fonctionnent car ils declenchent des actions immediates (click sur un input ref, appel async, toggle d'un picker inline) qui ne dependent pas d'un Dialog monte conditionnellement.

### Solution

#### Fichier : `src/pages/Messages.tsx`

**Approche radicale** : ne pas utiliser le `DropdownMenuItem` de Radix pour le sondage. A la place, utiliser `onSelect` avec un `setTimeout` plus long (150ms) pour laisser le dropdown se fermer completement avant de changer le state. Mais surtout, ajouter un `console.log` pour verifier que le handler est bien appele.

Plus specifiquement :

1. **Sur le `DropdownMenuItem` "Sondage"** (ligne 2229-2235) : remplacer `onClick` par `onSelect` avec un callback qui :
   - Appelle `e.preventDefault()` pour empecher le comportement par defaut de Radix
   - Utilise `setTimeout(() => setShowCreatePoll(true), 150)` pour decaler l'ouverture du dialog apres la fermeture complete du dropdown

2. **Alternative si ca ne marche toujours pas** : transformer le bouton "Sondage" en un simple `div` avec un `onClick` direct, en le sortant du systeme `DropdownMenuItem` de Radix, ce qui elimine toute interference.

La solution 1 est tentee en premier car elle garde la coherence visuelle du menu.

