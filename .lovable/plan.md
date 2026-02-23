

## Menu contextuel iMessage sur appui long

Remplacer le bouton "+" des reactions et le bouton repondre par un menu contextuel style iMessage qui apparait sur appui long sur un message.

### Ce qui change

**Supprimer** : Le bloc "Reply + Reactions" sous les messages (lignes 2020-2046 de Messages.tsx) qui contient le bouton repondre et le composant `MessageReactions` avec son bouton "+".

**Ajouter** : Un appui long (long press) sur chaque bulle de message ouvre un overlay plein ecran sombre avec :
1. La barre d'emojis rapides en haut (coeur, pouce, rire, etc.) - style iMessage
2. Un menu d'actions en dessous :
   - Repondre (icone fleche)
   - Copier (icone copie) - copie le texte du message
   - Supprimer (icone poubelle, rouge) - seulement pour ses propres messages
3. Un tap en dehors ferme le menu

**Conserver** : L'affichage des reactions deja posees sous les bulles (les petites pilules avec compteur).

### Details techniques

#### 1. Nouveau composant `MessageLongPressMenu.tsx`

- Props : `isOpen`, `onClose`, `message`, `isOwnMessage`, `onReaction(emoji)`, `onReply()`, `onDelete()`, `position`
- Overlay sombre (`bg-black/60`) avec `AnimatePresence` pour l'animation
- Barre d'emojis rapides : `['coeur', 'pouce', 'rire', 'etonne', 'triste', 'feu']` dans un conteneur arrondi
- Liste d'actions avec icones, style fond sombre arrondi
- Le bouton "+" a la fin des emojis ouvre un picker plus complet (optionnel, phase 2)

#### 2. Modifications dans `Messages.tsx`

- Ajouter un state `longPressMessage` pour stocker le message actuellement selectionne
- Ajouter un handler `onTouchStart`/`onTouchEnd` sur chaque bulle de message avec un timer de 500ms pour detecter l'appui long
- Supprimer le bloc lignes 2020-2046 (bouton repondre + MessageReactions avec "+")
- Garder uniquement l'affichage des reactions groupees (sans le bouton "+") sous les bulles
- Ajouter le composant `MessageLongPressMenu` en bas du JSX

#### 3. Modification de `MessageReactions.tsx`

- Ajouter un mode `displayOnly` qui affiche seulement les pilules de reactions existantes sans le bouton "+" et sans le picker
- Ce mode est utilise dans la vue normale des messages

### Rendu visuel

```text
+----------------------------------+
|        (overlay sombre)          |
|                                  |
|  +----------------------------+  |
|  | coeur rire etonne triste + |  |
|  +----------------------------+  |
|                                  |
|  [ Bulle du message ]            |
|                                  |
|  +----------------------------+  |
|  | <- Repondre                |  |
|  | [] Copier                  |  |
|  | X  Supprimer (rouge)      |  |
|  +----------------------------+  |
+----------------------------------+
```

### Fichiers concernes

- `src/components/MessageLongPressMenu.tsx` (nouveau)
- `src/components/MessageReactions.tsx` (ajout mode displayOnly)
- `src/pages/Messages.tsx` (long press + suppression ancien UI)

