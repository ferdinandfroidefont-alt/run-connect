

## Remplacer le `confirm()` natif par un AlertDialog pour la suppression de message

### Probleme

Quand on supprime un message, le navigateur affiche un `confirm()` natif du browser (la boite de dialogue grise/moche qu'on voit sur la capture). Il faut le remplacer par un vrai composant AlertDialog de l'app.

### Modification - `src/pages/Messages.tsx`

#### 1. Importer AlertDialog

Ajouter les imports depuis `@/components/ui/alert-dialog` :
- `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`

#### 2. Ajouter un state pour la confirmation

Ajouter un state `messageToDelete` (`string | null`) pour stocker l'ID du message a supprimer.

#### 3. Remplacer le `confirm()` par le state

Dans le bouton de suppression (ligne 1853), au lieu de `if (confirm(...)) { handleDeleteMessage(...) }`, simplement faire `setMessageToDelete(message.id)`.

#### 4. Ajouter le composant AlertDialog dans le JSX

Ajouter en bas du composant un `AlertDialog` qui :
- S'ouvre quand `messageToDelete` n'est pas null
- Titre : "Supprimer ce message ?"
- Description : "Cette action est irreversible."
- Bouton "Annuler" : remet `messageToDelete` a null
- Bouton "Supprimer" (style rouge) : appelle `handleDeleteMessage(messageToDelete)` puis remet a null

### Resultat

Une boite de dialogue propre, style iOS/app, au lieu du popup natif du navigateur.

