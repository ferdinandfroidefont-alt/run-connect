

# Refonte complète du Classement — Niveau world-class

## Constat actuel
Le classement actuel est fonctionnel mais basique : podium plat avec des barres colorées, liste monotone, bouton "Voir plus" oldschool, pas de mouvement de rang, pas de recherche, header fade. Ca ressemble à un prototype, pas à une app utilisée par des millions.

## Ce que Strava fait bien (et ce qu'on va dépasser)

Strava : liste propre, segment tabs, sticky "my rank". C'est clean mais **statique et sans émotion**.

Notre approche : **dynamique, sociale, et addictive**.

---

## Design — Nouvelle architecture visuelle

### 1. Hero Header immersif avec "Ma Position"
Au lieu d'un simple header texte, un **gradient hero** qui affiche directement ta position en gros, ton rang, et les points. Toujours visible, sticky. L'utilisateur sait immédiatement où il en est sans scroller.

```text
┌─────────────────────────────┐
│  ← Classement               │  sticky backdrop-blur
│  ┌───────────────────────┐  │
│  │  #42  ·  Top 3.2%     │  │  ta position en gros
│  │  1,847 pts · Or 🥇    │  │  rank badge inline
│  │  ▲ 5 places cette sem. │  │  mouvement de rang
│  └───────────────────────┘  │
│  [Général] [Running] [Amis] │  segment control iOS
└─────────────────────────────┘
```

### 2. Podium 3D-like repensé
- Fond **gradient sombre** (pas blanc) pour créer du contraste
- Avatars plus gros avec **glow effect** par rang (or=glow jaune, argent=glow gris)
- **Points animés** avec `framer-motion` counter
- Les 3 barres en dégradé avec **glassmorphism**
- Badge de mouvement de rang (▲3, ▼1) sous chaque nom

### 3. Segment Control iOS au lieu de pill buttons
Remplacer la barre de boutons par un vrai **segmented control** natif iOS (comme Strava) : `Général | Running | Vélo | Amis | Clubs`. Plus propre, plus pro.

### 4. Liste avec infinite scroll + rank movement
- **Supprimer le bouton "Voir plus"** → infinite scroll avec `IntersectionObserver`
- Chaque row affiche un **indicateur de mouvement** (▲ vert / ▼ rouge / = gris) pour le changement de position sur la semaine
- Row du current user toujours **highlighted** avec un subtil gradient primary
- Séparateurs fins `ml-14` style iOS natif

### 5. Floating "Ma Position" pill
Quand l'utilisateur scrolle loin de sa position, un **pill flottant** apparaît en bas : `"#42 · Voir ma position"` — tap pour auto-scroll smooth jusqu'à sa ligne.

### 6. Recherche inline
Un champ de recherche discret en haut de la liste pour **chercher un ami** dans le classement. Strava ne l'a pas — nous oui.

### 7. Empty state premium
Si aucun résultat (filtre club sans membres, etc.) : illustration + message engageant au lieu du vide.

---

## Fichiers impactés

| Fichier | Changement |
|---------|-----------|
| `src/pages/Leaderboard.tsx` | Refonte complète : hero header, infinite scroll, search, floating pill, nouveau podium |
| `src/components/leaderboard/FilterBar.tsx` | Remplacement par un segmented control iOS natif |
| `src/components/leaderboard/ScrollToMyRankButton.tsx` | Redesign en floating pill glassmorphism |

## Composants supprimés (plus utilisés dans la page)
- `MyRankCard.tsx` → remplacé par le hero header inline
- `SeasonStatsCard.tsx` → déjà retiré
- `LeaderboardCard.tsx` → remplacé par le nouveau `LeaderboardRow` inline

## Détails techniques

- **Infinite scroll** : `useRef` + `IntersectionObserver` sur un sentinel div en bas de liste, incrémente `currentPage` automatiquement
- **Rank movement** : nouveau champ `rank_change` calculé côté client en comparant le rang actuel vs le rang de la semaine précédente (requête supplémentaire légère)
- **Animated counter** : `framer-motion` `useMotionValue` + `useTransform` pour animer les points dans le hero
- **Segment control** : div flex avec `transform translateX` animé sur le slider actif, pas de librairie externe
- **Search** : filtre client-side sur le `leaderboard` state existant avec debounce 300ms
- **Glow effect podium** : `box-shadow` avec couleur du rang + blur 20px

