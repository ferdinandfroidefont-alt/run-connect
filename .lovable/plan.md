

## Ajouter un bouton appareil photo sur chaque conversation (style Instagram)

### Objectif

Ajouter une icone appareil photo a droite de chaque conversation dans la liste, comme sur Instagram. Au clic, l'appareil photo s'ouvre (via `useCamera.takePicture()`), et la photo prise est envoyee directement dans cette conversation.

### Modification - `src/pages/Messages.tsx`

#### 1. Importer `Camera` depuis lucide-react

Ajouter `Camera` dans les imports lucide existants (ligne 29-55).

#### 2. Ajouter une fonction d'envoi rapide de photo

Creer une fonction `handleQuickCameraForConversation(conversation)` qui :
- Appelle `takePicture()` depuis le hook `useCamera` (deja importe)
- Si un fichier est retourne, upload vers `message-files` bucket Supabase
- Insere un message de type `file` / `image` dans la conversation ciblee
- Met a jour `conversations.updated_at`
- Recharge la liste des conversations

Cette fonction reprend la meme logique que `uploadFile` mais sans necessiter que `selectedConversation` soit defini (elle recoit la conversation en parametre).

#### 3. Ajouter l'icone Camera dans chaque ligne de conversation

Dans le rendu de la liste (lignes ~2408-2534), ajouter un bouton avec l'icone `Camera` a droite de chaque conversation, entre le contenu texte et le bord droit :

```text
[ Avatar ]  [ Nom + dernier message ]  [ Camera icon ]
```

- Icone de taille `h-5 w-5`, couleur `text-muted-foreground`
- Au clic (`onClick` avec `stopPropagation` pour ne pas ouvrir la conversation) : appelle `handleQuickCameraForConversation(conversation)`
- Masque en mode selection (`isSelectionMode`)

#### 4. Hook useCamera - ajouter `takePicture`

Le hook `useCamera` exporte deja `takePicture` mais il n'est pas destructure dans Messages.tsx. Ajouter `takePicture` dans le destructuring existant (ligne 165).

### Fichier modifie

| Fichier | Modification |
|---------|-------------|
| `src/pages/Messages.tsx` | Import Camera, destructure takePicture, fonction handleQuickCameraForConversation, icone dans la liste |

