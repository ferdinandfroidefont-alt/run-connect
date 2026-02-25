

# Messages systeme dans les clubs (style Instagram)

## Objectif

Ajouter des messages systeme automatiques dans les conversations de club, comme sur Instagram :
- "**ferdinand-stat-triathlon** a cree le club"
- "**ferdinand-stat-triathlon** a ajoute **griffonbleu.03**"
- "**griffonbleu.03** a rejoint le club"

## Analyse

Le champ `message_type` existe deja dans la table `messages` (text, image, file, voice, session, poll, coaching_session). Il suffit d'ajouter un type `system` et d'inserer ces messages aux bons moments.

## Plan

### 1. Inserer un message systeme a la creation du club

**Fichier** : `src/components/CreateClubDialogPremium.tsx` et `src/components/CreateClubDialog.tsx`

Apres l'INSERT de la conversation et du createur dans `group_members`, inserer un message :
```
{ conversation_id, sender_id: user.id, content: "a créé le club", message_type: "system" }
```

Si des membres sont ajoutes a la creation, inserer aussi :
```
{ conversation_id, sender_id: user.id, content: "a ajouté @username1, @username2", message_type: "system" }
```

### 2. Inserer un message systeme quand un membre est invite/ajoute

**Fichier** : `src/components/EditClubDialog.tsx` (handleAddMember)

Apres l'envoi de l'invitation, pas de message (c'est une invitation, pas un ajout).

**Fichier** : `src/components/NotificationCenter.tsx` (handleAcceptClubInvitation)

Apres le `accept_club_invitation` RPC reussi, inserer :
```
{ conversation_id: club_id, sender_id: user.id, content: "a rejoint le club", message_type: "system" }
```

### 3. Afficher les messages systeme dans le chat

**Fichier** : `src/pages/Messages.tsx`

Dans le rendu des messages (vers ligne 1839), ajouter une condition pour `message_type === 'system'` **avant** le rendu standard. Les messages systeme seront affiches :
- Centres, sans bulle
- Texte gris petit, style "username action"
- Pas de reactions, pas de long-press, pas de reply

```text
┌─────────────────────────────────┐
│                                 │
│   ferdinand-stat a créé le club │
│                                 │
│  ferdinand-stat a ajouté        │
│       griffonbleu.03            │
│                                 │
│  griffonbleu.03 a rejoint       │
│       le club                   │
│                                 │
└─────────────────────────────────┘
```

Style CSS : `text-center text-xs text-muted-foreground py-2 italic`

### 4. Gerer les messages systeme dans la liste des conversations

**Fichier** : `src/pages/Messages.tsx` (affichage du dernier message)

Ajouter une condition pour `message_type === 'system'` dans le preview du dernier message (ligne ~2698) :
```
{conversation.last_message.message_type === 'system' && `${senderName} ${content}`}
```

### 5. Inserer un message systeme retroactif pour le club Ferdi

Migration SQL pour inserer un message "a cree le club" pour la conversation existante.

## Fichiers modifies

| Fichier | Changement |
|---------|-----------|
| `src/components/CreateClubDialogPremium.tsx` | INSERT message systeme apres creation |
| `src/components/CreateClubDialog.tsx` | Idem |
| `src/components/NotificationCenter.tsx` | INSERT message systeme quand invitation acceptee |
| `src/pages/Messages.tsx` | Rendu centre des messages systeme + preview dans la liste |
| Migration SQL | Message retroactif pour le club Ferdi |

