

## Corriger le menu d'appui long sur les messages

### Le probleme

Le composant `MessageLongPressMenu` (reactions, repondre, copier, supprimer) et le `AlertDialog` de confirmation de suppression sont rendus uniquement dans le bloc `return` de la **liste des conversations** (ligne 2710-2766), mais jamais dans le bloc `return` de la **vue conversation** (lignes 1656-2331).

Quand l'utilisateur appuie longuement sur un message dans une conversation, `setLongPressMessage(message)` est appele, mais le composant `MessageLongPressMenu` n'existe pas dans l'arbre JSX de la vue conversation. Il ne peut donc jamais s'afficher au bon endroit.

### La solution

Deplacer le `MessageLongPressMenu` et le `AlertDialog` de suppression de message depuis la vue liste (lignes 2710-2766) vers la vue conversation (avant la fermeture du `</>` a la ligne 2330).

### Details techniques

#### Fichier : `src/pages/Messages.tsx`

1. **Ajouter** le `MessageLongPressMenu` et le `AlertDialog` de suppression de message juste avant le `</>` de fermeture de la vue conversation (ligne 2330), c'est-a-dire apres la zone de saisie et avant la fin du return de `if (selectedConversation)`.

2. **Supprimer** ces memes composants de leur emplacement actuel dans la vue liste (lignes 2710-2766), car ils n'ont aucune raison d'exister dans la liste des conversations.

### Resultat attendu

- L'appui long sur un message dans une conversation affiche correctement le menu contextuel (reactions, repondre, copier, supprimer) par-dessus la conversation
- La confirmation de suppression s'affiche aussi dans la vue conversation
- Aucun changement de comportement sur la liste des conversations
