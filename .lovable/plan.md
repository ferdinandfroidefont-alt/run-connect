

## Diagnostic : cause racine trouvée

Le composant `Messages.tsx` a **3 blocs return distincts** :

1. **Ligne 1640** : `if (showNewConversation) return (...)` — vue nouvelle conversation
2. **Ligne 1654** : `if (selectedConversation) return (...)` — vue conversation (lignes 1657–2389)
3. **Ligne 2392** : `return (...)` — vue liste des conversations (lignes 2392–2809)

Le bouton **Sondage** est dans le return n°2 (conversation sélectionnée, autour de la ligne 2230). Mais le **`CreatePollDialog`** est dans le return n°3 (liste des conversations, ligne 2778).

Quand une conversation est ouverte, le composant fait un early return à la ligne 2389 et **n'atteint jamais** le `CreatePollDialog` à la ligne 2778. Le dialog n'est tout simplement jamais monté dans le DOM.

## Solution

**Déplacer le `CreatePollDialog`** du return n°3 vers le return n°2, juste avant la fermeture du fragment `<>...</>` à la ligne 2388.

### Changement concret

**`src/pages/Messages.tsx`** :

1. **Supprimer** le bloc `CreatePollDialog` des lignes 2778–2802 (dans le return de la liste)
2. **Insérer** ce même bloc dans le return de la conversation sélectionnée, juste avant `</>`à la ligne 2388 (avant le `MessageLongPressMenu`)

Le code à insérer (identique, juste déplacé) :

```tsx
{user && (
  <CreatePollDialog
    open={showCreatePoll}
    onOpenChange={setShowCreatePoll}
    conversationId={selectedConversation.id}
    userId={user.id}
    onPollCreated={async (pollId: string) => {
      try {
        await supabase.from('messages').insert({
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          content: pollId,
          message_type: 'poll',
        });
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', selectedConversation.id);
        loadMessages(selectedConversation.id);
      } catch (err) {
        console.error('Error sending poll message:', err);
      }
    }}
  />
)}
```

La condition `selectedConversation &&` n'est plus nécessaire car on est déjà dans le bloc `if (selectedConversation)`. On garde juste `user &&`.

### Pourquoi ça ne marchait pas

Aucune des solutions précédentes (setTimeout, modal, onSelect, div) ne pouvait fonctionner car le problème n'était pas lié au dropdown ou au timing — le `CreatePollDialog` n'était simplement **jamais rendu** quand une conversation était ouverte.

