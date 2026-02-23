

## Diagnostic

Le sondage est bien cree dans la table `polls` (confirme en BDD), mais **aucun message n'est insere** dans la table `messages`. Le probleme est double :

1. **Pas d'`await`** : dans `CreatePollDialog`, `onPollCreated(pollId)` n'est pas `await`ed. Le dialog se ferme immediatement via `onOpenChange(false)`, ce qui peut causer des problemes de timing.

2. **Erreur silencieuse** : dans le callback `onPollCreated`, le code fait `await supabase.from('messages').insert(...)` mais ne verifie pas le `{ error }` retourne. Supabase JS ne lance PAS d'exception en cas d'echec — il retourne `{ data, error }`. Le `try/catch` ne capture donc rien et l'erreur est completement ignoree.

## Solution

### Fichier 1 : `src/components/CreatePollDialog.tsx`

**Ajouter `await`** avant `onPollCreated` pour que l'insertion du message se termine avant la fermeture du dialog :

```tsx
await onPollCreated((data as any).id);  // await ajouté
onOpenChange(false);
```

### Fichier 2 : `src/pages/Messages.tsx`

**Verifier les erreurs Supabase** dans le callback `onPollCreated` et ajouter du logging :

```tsx
onPollCreated={async (pollId: string) => {
  try {
    const { error: msgError } = await supabase.from('messages').insert({
      conversation_id: selectedConversation.id,
      sender_id: user.id,
      content: pollId,
      message_type: 'poll',
    });

    if (msgError) {
      console.error('❌ Error inserting poll message:', msgError);
      toast({ title: 'Erreur', description: 'Impossible d\'envoyer le sondage', variant: 'destructive' });
      return;
    }

    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', selectedConversation.id);

    loadMessages(selectedConversation.id);
  } catch (err) {
    console.error('Error sending poll message:', err);
  }
}}
```

Cela permettra de :
- Voir l'erreur exacte retournee par Supabase si l'insert echoue (probablement une erreur RLS)
- Afficher un toast d'erreur a l'utilisateur
- Garantir que le message est insere avant la fermeture du dialog

