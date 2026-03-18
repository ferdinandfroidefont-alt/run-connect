

## Plan: Refonte de l'écran Classement — Bloc scrollable et structure fixe

### Problème actuel
L'écran actuel scrolle entièrement (page entière). Le leaderboard n'est pas dans un bloc délimité. La structure manque de densité.

### Changement principal : `src/pages/Leaderboard.tsx`

**Structure fixe (pas de scroll page)** :

```text
┌─────────────────────────────┐
│ HEADER FIXE (📘 + 🎯)      │  ← sticky top
├─────────────────────────────┤
│ CARTE UTILISATEUR           │  ← fixe
├─────────────────────────────┤
│ FILTRES (2 barres)          │  ← fixe
├─────────────────────────────┤
│ 🎁 Récompense saison        │  ← fixe
├─────────────────────────────┤
│ Recherche + info saison     │  ← fixe
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │  BLOC LEADERBOARD       │ │  ← flex-1, overflow-y-auto
│ │  (scroll interne seul)  │ │
│ │  #1 🥇 ...              │ │
│ │  #2 🥈 ...              │ │
│ │  #3 🥉 ...              │ │
│ │  #4 ...                 │ │
│ │  ...                    │ │
│ │  ───── user épinglé ──  │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

**Modifications concrètes** :

1. Le conteneur racine passe de `overflow-y-auto` à `flex flex-col overflow-hidden` (pas de scroll global)
2. Header, carte, filtres, récompense, recherche = partie fixe en haut
3. Le bloc leaderboard = `flex-1 overflow-hidden` contenant une carte arrondie (`mx-3 rounded-xl border shadow-sm bg-card`) avec scroll interne (`overflow-y-auto`)
4. Si l'utilisateur n'est pas visible dans la liste scrollable → sa ligne apparaît épinglée en bas du bloc avec fond `bg-primary/5`
5. Supprimer le `<div className="h-24" />` spacer en bas (plus nécessaire)
6. L'IntersectionObserver pour infinite scroll s'attache au conteneur scroll interne au lieu de la page

**Aucun autre fichier ne change** — FilterBar, MyRankCard, RulesSheet, SeasonRewardBanner restent identiques.

