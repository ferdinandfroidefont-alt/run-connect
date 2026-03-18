

## Plan: Refonte complète de l'écran Classement

### Vue d'ensemble
Réécrire `src/pages/Leaderboard.tsx` et adapter les composants associés pour créer un leaderboard moderne, dense, sans podium, avec carte utilisateur, double barre de filtres, bottom sheet Règles, bloc récompense saison, et ligne épinglée.

### Fichiers à modifier

**1. `src/pages/Leaderboard.tsx`** — Réécriture complète

Structure du rendu (de haut en bas) :

- **Header fixe** : titre "Classement" centré, bouton retour gauche, icônes 📘 (Règles) et 🎯 (Objectif) à droite
- **Carte utilisateur** : rang, points, niveau avec emoji, barre XP vers prochain rang, variation dynamique ("+1 place 🔥"), PAS de "Top %"
- **Double barre filtres** :
  - Barre 1 (scope) : 🌍 Global / 📍 Local / 👥 Amis / 🏃 Clubs
  - Barre 2 (sport) : 🏆 Général (défaut) / 🏃 Running / 🚴 Vélo / 🚶 Marche / ➕ autres
- **Bloc récompense saison** : "🎁 Le #1 gagne un code promo exclusif"
- **Barre recherche**
- **Liste leaderboard** (scroll, PAS de podium) :
  - Chaque ligne : rang, médaille pour top 3 (🥇🥈🥉), avatar, pseudo + @username, points, variation (+1 🔼 / -2 🔽)
  - Si user pas visible → ligne épinglée en bas avec fond bleu

Supprimer : composant `Podium`, appel à `Podium`, `topPercentage`, `top3`/`rest` split.

**2. `src/components/leaderboard/FilterBar.tsx`** — Refactoring en double barre

Séparer en deux rangées :
- Rangée 1 : scope (Global/Local/Amis/Clubs) — segmented control
- Rangée 2 : sport (Général/Running/Vélo/Marche/+ autres) — segmented control + bouton Plus

Ajouter un nouveau type `ScopeType = 'global' | 'local' | 'friends' | 'clubs'` en plus du `FilterType` sport existant.

**3. `src/components/leaderboard/RulesSheet.tsx`** — Nouveau fichier

Bottom sheet (Sheet component) avec :
- Titre "Comment gagner des points ?"
- Liste des actions avec emojis et points
- Note "Seules les activités vérifiées comptent ✅"

**4. `src/components/leaderboard/MyRankCard.tsx`** — Modifier

- Supprimer "Top %" section
- Ajouter variation dynamique ("+1 place aujourd'hui 🔥")
- Fond blanc, coins arrondis, ombre légère, accent bleu
- Props : ajouter `rankChange: number`

**5. `src/components/leaderboard/SeasonRewardBanner.tsx`** — Nouveau fichier

Petit bloc : "🎁 Récompense saison — Le #1 gagne un code promo exclusif"

**6. `src/components/leaderboard/ScrollToMyRankButton.tsx`** — Garder tel quel (ligne épinglée en bas quand user non visible)

### Logique conservée
- Toute la logique de fetch (RPC `get_complete_leaderboard`, filtres activité/amis/clubs, pagination infinie) reste identique
- `getUserRank()`, `getCurrentSeasonDates()`, rank helpers conservés
- `ProfilePreviewDialog` conservé
- Recherche conservée

### Points clés du design
- Pas de podium du tout — liste plate dès le #1
- Top 3 distingués uniquement par médailles 🥇🥈🥉 dans la liste
- Carte utilisateur compacte en haut (avant les filtres)
- Double barre de filtres : scope + sport
- Ligne utilisateur épinglée en bas si hors viewport
- Espaces réduits, design dense iOS premium

