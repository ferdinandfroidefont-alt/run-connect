

## Aligner le design de la page "Profil" sur celui de "Mon Profil"

### Objectif

Harmoniser l'ordre et la presentation des sections entre la vue "Mon Profil" (propre profil) et la vue "Profil" (profil d'un autre utilisateur) dans `src/pages/Profile.tsx`.

### Changements prevus

#### Fichier : `src/pages/Profile.tsx`

**1. Ajouter PersonalRecords sur "Mon Profil"**
- Actuellement les records personnels (course, velo, natation, etc.) ne s'affichent que sur le profil des autres utilisateurs
- Les ajouter aussi sur son propre profil, juste apres ProfileStatsGroup (meme position que sur le profil des autres)

**2. Ajouter UserActivityChart sur "Mon Profil"**
- Le graphique d'activite ne s'affiche que sur le profil des autres
- L'ajouter aussi sur son propre profil, apres PersonalRecords

**3. Deplacer CommonClubs apres ActivityTimeline**
- Les clubs en commun restent visibles uniquement sur le profil d'un autre utilisateur (logique, car on ne peut pas avoir de clubs "en commun" avec soi-meme)
- Les deplacer apres ActivityTimeline pour que l'ordre des sections communes soit identique

### Ordre final des sections (identique pour les deux vues)

```text
1. Header (avatar, nom, badges, stats, bio, fiabilite)
2. StreakBadge
3. PersonalGoals (propre profil uniquement)
4. ProfileStatsGroup
5. PersonalRecords (les deux vues)
6. UserActivityChart (les deux vues)
7. ActivityTimeline
8. CommonClubs (autre utilisateur uniquement)
9. Routes section
```

### Section technique

- `PersonalRecords` a besoin de `records` (running_records, cycling_records, etc.) qui sont deja charges dans `profile` pour les deux vues
- `UserActivityChart` a besoin de `userId` et `username`, disponibles dans les deux cas
- Le formulaire d'edition reste uniquement sur "Mon Profil", place entre ProfileStatsGroup et PersonalRecords

