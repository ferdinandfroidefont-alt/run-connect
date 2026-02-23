

## Corriger le bouton "Sondage" qui ne fonctionne pas

### Probleme identifie

Le composant `<CreatePollDialog>` est **importe mais jamais rendu** dans le JSX de `Messages.tsx`. Quand on clique sur "Sondage", le state `showCreatePoll` passe a `true`, mais aucun dialog ne s'affiche car le composant n'est pas monte dans l'arbre React.

De plus, il manque le callback `onPollCreated` qui doit envoyer un message de type `poll` dans la conversation apres la creation du sondage.

### Modifications

#### Fichier : `src/pages/Messages.tsx`

1. **Ajouter le rendu du `<CreatePollDialog>`** dans le JSX, a cote des autres dialogs existants (vers la fin du composant). Il recevra :
   - `open={showCreatePoll}`
   - `onOpenChange={setShowCreatePoll}`
   - `conversationId={selectedConversation?.id}`
   - `userId={user?.id}`
   - `onPollCreated` : callback qui envoie un message de type `poll` dans la conversation (le `content` du message sera l'ID du sondage cree)

2. **Implementer le callback `onPollCreated`** qui :
   - Insere un message avec `message_type: 'poll'` et `content: pollId` dans la table `messages`
   - Met a jour `updated_at` de la conversation
   - Recharge les messages

3. **Rendre le sondage disponible aussi en DM** (pas seulement en groupe) : supprimer la condition `selectedConversation?.is_group` autour du bouton "Sondage", pour que tous les utilisateurs puissent creer des sondages dans n'importe quelle conversation.

