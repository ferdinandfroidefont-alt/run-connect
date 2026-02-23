

## Ajouter un filtre "Creees / Rejointes" dans la page Mes Seances

### Objectif

Ajouter un sous-filtre permettant de basculer entre les seances creees par l'utilisateur et les seances qu'il a rejointes en tant que participant. Pour les seances rejointes, masquer les boutons Modifier/Supprimer et ajouter un bouton pour contacter l'organisateur.

### Modifications - Fichier `src/pages/MySessions.tsx`

**1. Nouveau state pour le sous-filtre**
- Ajouter `sessionSource: 'created' | 'joined'` (defaut: `'created'`)
- Ajouter `joinedSessions: UserSession[]` pour stocker les seances rejointes
- Ajouter `organizerProfiles: Map<string, Profile>` pour avoir les infos de l'organisateur

**2. Nouvelle fonction `loadJoinedSessions()`**
- Requete `session_participants` filtree par `user_id = user.id` pour recuperer les `session_id`
- Puis requete `sessions` avec `.in('id', sessionIds)` en excluant `.neq('organizer_id', user.id)`
- Pour chaque seance, charger le profil de l'organisateur (`profiles` via `organizer_id`)

**3. UI - Nouveau segmented control sous "Seances/Itineraires"**
- Ajouter un second segmented control iOS-style avec deux options : "Creees" et "Rejointes"
- Place juste au-dessus des filtres temporels (Toutes / A venir / Terminees)

**4. Vue liste - Seances rejointes**
- Meme rendu que les seances creees mais avec en plus le nom/avatar de l'organisateur affiche sous le titre
- Badge "Rejoint" au lieu du badge de statut standard

**5. Vue detail - Seances rejointes**
- Masquer les boutons "Modifier" (Edit) et "Supprimer" (Trash2) dans le header
- Ajouter une section "ORGANISATEUR" avec avatar, nom, et bouton "Envoyer un message"
- Le bouton message navigue vers `/messages?startConversation={organizerId}`
- Garder les sections Informations, Description, Participants identiques
- Ajouter un bouton "Quitter la seance" (suppression du participant) a la place de "Supprimer"

**6. Realtime**
- Ajouter un channel realtime sur `session_participants` filtre par `user_id` pour recharger les seances rejointes quand le statut change

### Resume des changements

| Element | Detail |
|---------|--------|
| State | `sessionSource`, `joinedSessions`, `organizerProfiles` |
| Fonctions | `loadJoinedSessions()`, `handleLeaveSession()` |
| UI header | Segmented control "Creees / Rejointes" |
| Vue liste rejointes | Avatar orga + nom sous le titre |
| Vue detail rejointes | Pas de Modifier/Supprimer, section Organisateur + bouton Message, bouton Quitter |
| Fichier modifie | `src/pages/MySessions.tsx` uniquement |

