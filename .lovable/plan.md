

# Refonte complete -- Vrai design iOS natif

## Problemes actuels

L'app a les bonnes couleurs Apple (noir pur, #1C1C1E cards, systemBlue) et les bons composants de base (tab bar, segmented controls, frosted headers). Mais elle ressemble encore a un site web a cause de :

1. **Ombres lourdes** : `shadow-lg shadow-primary/20`, `shadow-primary/25` sur les boutons et cards -- typiquement web
2. **Effets glow/gradient** : l'icone de l'app sur l'ecran de chargement et d'auth a un `boxShadow` bleu lumineux
3. **FeedCard** : structure "carte empilee" style Instagram web, pas une vraie liste iOS
4. **DiscoverCard** : fonds pastel colores par activite -- pattern web, pas Apple
5. **FeedActions** : bouton "Rejoindre" avec `shadow-lg shadow-primary/20` -- pas iOS
6. **Profile** : avatar avec `bg-gradient-to-br` et `ring-white shadow-lg` -- trop decore
7. **Auth page** : header avec bordure epaisse, sections avec titres uppercase espaces
8. **Espacement** : les cards sont separees par du vide (`space-y-2`, `space-y-3`) au lieu d'etre collees en groupes iOS

## Philosophie de la correction

Sur iOS natif, les listes sont **collees** en groupes avec des **separateurs fins** (hairline) entre les items. Il n'y a **jamais** d'ombre visible, **jamais** de gradient, **jamais** de fond colore par categorie. Tout est sobre : fond noir, cards #1C1C1E, texte blanc, accent systemBlue.

## Modifications detaillees

### 1. Supprimer toutes les ombres web

**`src/components/feed/FeedActions.tsx`** (ligne 122) :
- Remplacer `shadow-lg shadow-primary/20` par rien -- le bouton iOS n'a pas d'ombre
- Resultat : `className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-5 font-medium"`

**`src/components/feed/DiscoverCard.tsx`** (ligne 146) :
- Supprimer `shadow-lg shadow-primary/25` du bouton "Rejoindre"
- Resultat : `className="flex-1 h-10 rounded-full ios-gradient-btn text-white border-0"`

### 2. DiscoverCard -- Supprimer les fonds pastel

**`src/components/feed/DiscoverCard.tsx`** :
- Remplacer le fond pastel par activite (`getActivityPastel`) par un simple `bg-card`
- Supprimer les fonctions `getActivityPastel` et les classes `ios-pastel-*`
- Le card devient un simple conteneur `bg-card rounded-[12px]` uniforme
- Ajouter un separateur fin `border-b border-border/30` entre les cards au lieu d'un `space-y-2`

### 3. FeedCard -- Style liste iOS

**`src/components/feed/FeedCard.tsx`** :
- Supprimer `mb-px` (le separateur sera gere par le parent)
- Garder le `bg-card` sans ombre ni bordure (correct actuellement)
- Le parent `Feed.tsx` ajoutera `divide-y divide-border/30` pour les separateurs entre cards

**`src/pages/Feed.tsx`** :
- Ligne 190 : remplacer `<div className="pt-1">` par `<div className="divide-y divide-border/30">`
- Ligne 239 : remplacer `<div className="py-4 space-y-2">` par `<div className="divide-y divide-border/30">` pour les DiscoverCards aussi

### 4. LoadingScreen -- Epure Apple

**`src/components/LoadingScreen.tsx`** :
- Ligne 81 : supprimer le `boxShadow` glow bleu sur l'icone
- Rendre l'icone sobre : juste `rounded-[28px]` sans ombre
- Ligne 88 : supprimer le `boxShadow` sur le loading card
- Rendre le loading card sobre : juste `bg-card rounded-[14px] p-5` sans ombre

### 5. Auth page -- Nettoyage

**`src/pages/Auth.tsx`** :
- Ligne 592 : supprimer `border-b border-border` du header -- les headers iOS frosted n'ont pas de bordure epaisse, utiliser `border-b border-border/30` (subtil)
- Supprimer le `boxShadow` glow bleu sur l'icone de l'app (meme que LoadingScreen)
- Les sections "CONNEXION PAR CODE" et "OU AVEC MOT DE PASSE" : garder le style iOS grouped list actuel

### 6. Profile -- Simplifier l'avatar

**`src/pages/Profile.tsx`** (ligne 636-641) :
- Remplacer `ring-[3px] ring-white shadow-lg` par `ring-2 ring-border`
- Remplacer `bg-gradient-to-br from-primary/20 to-primary/40` du AvatarFallback par `bg-secondary text-foreground`

### 7. Leaderboard podium -- Simplifier

**`src/pages/Leaderboard.tsx`** :
- Les blocs podium (lignes 453-500) avec `bg-gray-400`, `bg-yellow-500`, `bg-amber-600` sont corrects pour un podium visuel -- les garder mais s'assurer qu'ils n'ont pas d'ombre

### 8. Nettoyage global des ombres

Rechercher et remplacer dans tous les fichiers :
- `shadow-lg shadow-primary/20` -> `` (supprimer)
- `shadow-lg shadow-primary/25` -> `` (supprimer)
- `shadow-lg` sur les boutons -> `` (supprimer, les boutons iOS n'ont pas d'ombre)

Les ombres `shadow-sm` et le hairline `shadow-[0_0_0_0.5px...]` sur les cards restent (c'est correct pour iOS).

### 9. Conversations list (Messages.tsx) -- Verification

La liste des conversations doit utiliser des separateurs fins, pas des espaces. Verifier que `SwipeableConversationItem` utilise bien un `border-b border-border/30` ou un `divide-y` parent.

## Fichiers modifies

| Fichier | Changement |
|---------|-----------|
| `src/components/feed/FeedActions.tsx` | Supprimer ombres du bouton Rejoindre |
| `src/components/feed/DiscoverCard.tsx` | Supprimer fonds pastel, ombres bouton |
| `src/components/feed/FeedCard.tsx` | Supprimer `mb-px` |
| `src/pages/Feed.tsx` | `divide-y divide-border/30` entre cards |
| `src/components/LoadingScreen.tsx` | Supprimer glow shadows |
| `src/pages/Auth.tsx` | Header border subtile, supprimer glow icon |
| `src/pages/Profile.tsx` | Simplifier avatar ring/shadow |

## Ce qui ne change PAS

- Toute la logique metier (Supabase, auth, messages, sessions, feed, leaderboard)
- Les headers frosted glass (deja corrects)
- La tab bar (deja correcte)
- Les segmented controls (deja corrects)
- Les IOSListItem / IOSListGroup (deja corrects)
- Les animations Framer Motion
- Le pull-to-refresh
- Toutes les fonctionnalites existantes
