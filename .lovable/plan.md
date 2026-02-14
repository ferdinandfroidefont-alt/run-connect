
# Harmonisation Edge-to-Edge sur toutes les pages

Appliquer le meme style "bord a bord" (sans padding horizontal, sans coins arrondis sur les cartes de liste) a toutes les pages restantes, en conservant les espacements verticaux.

## Pages a modifier

### 1. Leaderboard (`src/pages/Leaderboard.tsx`)
- Changer `<div className="p-4 space-y-4">` en `<div className="py-4 space-y-4">`
- Supprimer `rounded-[10px]` des conteneurs Podium et Classement (lignes 593, 598)
- Garder `px-4` sur le FilterBar, MyRankCard, StreakBadge, ProgressionChart, SeasonStatsCard, WeeklyChallengesCard, BadgesToUnlockCard (ces composants gerent leur propre padding interne)
- Squelette de chargement : `p-4` devient `py-4`

### 2. Subscription (`src/pages/Subscription.tsx`)
- Changer `<div className="px-4 py-6 space-y-6">` en `<div className="py-6 space-y-6">`
- Supprimer `rounded-[10px]` des 4 groupes de liste (Mon Abonnement, Plans Disponibles, Avantages Premium, Soutenir RunConnect)
- Garder `px-4` sur les headers de section (`<h3>`) et le warning d'expiration

### 3. Profile (`src/pages/Profile.tsx`)
- Changer `<div className="max-w-md mx-auto p-4 space-y-4">` en `<div className="max-w-md mx-auto py-4 space-y-4">`
- Supprimer `rounded-[10px]` des groupes iOS : formulaire d'edition (ligne 788), section stats autre utilisateur (ligne 845), clubs en commun (ligne 868), historique connexions (ligne 889), section routes (ligne 913)
- Garder `px-4` sur les headers de section et le contenu du profil header (centrage)

### 4. PublicProfile (`src/pages/PublicProfile.tsx`)
- Changer `className="max-w-2xl mx-auto pt-12 px-4 pb-8 space-y-4"` en `className="max-w-2xl mx-auto pt-12 pb-8 space-y-4"`
- Supprimer `rounded-[10px]` de la carte profil (ligne 163) et de la liste des seances (ligne 222)

### 5. Feed (`src/pages/Feed.tsx`)
- Section Discover : changer `<div className="p-4 space-y-3">` en `<div className="py-4 space-y-3">` (ligne 239)
- Section Friends skeletons : changer `px-3` en `py-2` sans padding horizontal (ligne 166)
- Section Discover loading : supprimer `p-4` du wrapper et `rounded-[10px]` du loader (lignes 225-226)

### 6. Search (`src/pages/Search.tsx`)
- Pas de changement necessaire (le contenu est deja gere par les sous-composants)

### 7. MySessions - Routes section (`src/pages/MySessions.tsx`)
- Supprimer `px-4` et `rounded-[10px]` des routes (lignes 702-704, 711, 723)
- Etat vide routes : supprimer `mx-4` et `rounded-[10px]`

## Composants enfants a ajuster si necessaire
- Les composants comme `MyRankCard`, `SeasonStatsCard`, `WeeklyChallengesCard`, `BadgesToUnlockCard`, `ProgressionChart`, `StreakBadge`, `OrganizerStatsCard` devront etre verifies pour s'assurer qu'ils n'ajoutent pas de padding horizontal ou coins arrondis en doublon. Si ces composants ont un `rounded-[10px]` interne, il faudra le retirer aussi.

## Principe directeur
- Les **cartes de liste / groupes** deviennent pleine largeur (`rounded-none`)
- Les **controles interactifs** (filtres segmentes, boutons de filtre, barres de recherche) gardent leur `px-4`
- Les **headers de section** gardent leur `px-4`
- Tous les **espacements verticaux** sont preserves
