## Fix: Supprimer la barre iOS qui apparait en haut sur plusieurs pages

### Probleme

Sur iOS, quand on tire vers le bas sur certaines pages (Confirmer Seance, Messages, Recherche, etc.), une barre de navigation du WebView apparait en haut. L'app perd sa stabilite et ne ressemble plus a une app native.

### Cause

Plusieurs pages utilisent `min-h-screen` comme conteneur principal, ce qui cree une page scrollable classique. Sur iOS, cela permet au WebView de "rubber-bander" (effet elastique) et de reveler la barre du navigateur.

Le composant `Layout.tsx` utilise deja `h-screen-safe` avec `overflow-hidden`, donc les pages enfants (Messages, Feed, Profile, Leaderboard) ne devraient PAS utiliser `min-h-screen` car elles sont deja dans un conteneur fixe.

### Solution

Appliquer le meme correctif sur toutes les pages concernees :


| Fichier                                 | Probleme                         | Correction                                                       |
| --------------------------------------- | -------------------------------- | ---------------------------------------------------------------- |
| `src/pages/ConfirmPresence.tsx`         | `min-h-screen` (pas dans Layout) | `fixed inset-0 flex flex-col` + contenu `flex-1 overflow-y-auto` |
| `src/pages/Messages.tsx` (liste)        | `min-h-screen` dans Layout       | Retirer `min-h-screen`, utiliser `h-full flex flex-col`          |
| `src/pages/Messages.tsx` (conversation) | `min-h-screen` dans Layout       | Retirer `min-h-screen`, utiliser `h-full flex flex-col`          |
| `src/pages/Feed.tsx`                    | `min-h-screen` dans Layout       | Retirer `min-h-screen`, utiliser `h-full`                        |
| `src/pages/Profile.tsx`                 | `min-h-screen` dans Layout       | Retirer `min-h-screen`, utiliser `h-full`                        |
| `src/pages/Leaderboard.tsx`             | `min-h-screen` dans Layout       | Retirer `min-h-screen`, utiliser `h-full`                        |
| `src/pages/Subscription.tsx`            | `min-h-screen` dans Layout       | Retirer `min-h-screen`, utiliser `h-full`                        |


### Detail technique

**Pages dans Layout** (Messages, Feed, Profile, Leaderboard, Subscription) :

- Le `Layout` gere deja le conteneur fixe avec `h-screen-safe overflow-hidden`
- Le scroll est gere par `main.overflow-auto`
- Les pages enfants doivent simplement remplir leur espace avec `h-full` au lieu de creer leur propre hauteur avec `min-h-screen`

**Pages hors Layout** (ConfirmPresence) :

- Utiliser `fixed inset-0` pour verrouiller la page
- Le contenu interne devient `flex-1 overflow-y-auto` pour un scroll contenu

**Page Search** :

- Deja correcte avec `fixed inset-0`, aucune modification necessaire
- Correction mineure : retirer le doublon `pt-safe` sur le header (deja present sur le conteneur parent)
- et je parle pas des barres que je t'ai dit de rajouter non la c'est une barre qui apparait en haut de chaque uniquement ares ce que je t'ai dit