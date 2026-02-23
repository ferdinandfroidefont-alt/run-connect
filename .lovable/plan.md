

## Diagnostic

L'erreur dans la console est claire :

```
new row for relation "messages" violates check constraint "messages_message_type_check"
```

La contrainte CHECK sur `messages.message_type` n'autorise que : `text`, `image`, `file`, `session`, `voice`. La valeur `poll` est rejetée.

## Solution

### Migration SQL

Supprimer l'ancienne contrainte et la recréer en ajoutant `'poll'` :

```sql
ALTER TABLE messages DROP CONSTRAINT messages_message_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_message_type_check 
  CHECK (message_type = ANY (ARRAY['text', 'image', 'file', 'session', 'voice', 'poll']));
```

### Aucun changement de code nécessaire

Le code dans `Messages.tsx` et `CreatePollDialog.tsx` est déjà correct — il insère `message_type: 'poll'`, qui sera accepté une fois la contrainte mise à jour.

