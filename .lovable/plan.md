

# Plan: Simplification et réorganisation de la page profil

## Problématique

La page profil actuelle (Profile.tsx + ProfilePreviewDialog.tsx + PublicProfile.tsx) affiche trop d'informations sans hiérarchie claire. L'utilisateur veut un profil centré sur l'activité sportive, inspiré de Strava, avec une structure simple et lisible.

## Objectifs

1. **Header clair**: Avatar, nom, pseudo, bio, boutons d'action, badges sportifs
2. **Stats principales** (3-4 max): Activités, Distance totale, Abonnés, Abonnements
3. **Activités récentes**: Section principale visible immédiatement
4. **Contenu secondaire**: Badges, records, classement → déplacés en bas
5. **Suppression/relocalisation**: Streak, fiabilité, timeline d'activité, clubs communs

## Structure cible

```
┌─────────────────────────────────────┐
│ Cover Image                         │
│                                     │
│     [Avatar]                        │
└─────────────────────────────────────┘
│ Nom d'affichage                     │
│ @username                           │
│ Bio                                 │
│ 🏃 Running · 🚴 Cyclisme            │
│ [Suivre] [Message]                  │
├─────────────────────────────────────┤
│ STATS RAPIDES (ligne unique)       │
│  42 activités  |  523 km            │
│  120 abonnés   |  85 abonnements    │
├─────────────────────────────────────┤
│ ACTIVITÉS RÉCENTES                  │
│ ┌───────────────────────────────┐   │
│ │ Course matinale               │   │
│ │ 10.2 km · 48:30 · Il y a 2j   │   │
│ └───────────────────────────────┘   │
│ ┌───────────────────────────────┐   │
│ │ Sortie vélo                   │   │
│ │ 45 km · 1h32 · Il y a 5j      │   │
│ └───────────────────────────────┘   │
├─────────────────────────────────────┤
│ PARCOURS & SÉANCES                  │
│ Voir les itinéraires créés          │
├─────────────────────────────────────┤
│ ACHIEVEMENTS (section pliable)      │
│ Badges · Records · Classement       │
└─────────────────────────────────────┘
```

## Modifications techniques

### 1. Créer une section "Activités récentes"

**Nouveau composant**: `src/components/profile/RecentActivities.tsx`

```typescript
interface Activity {
  id: string;
  type: 'created' | 'joined' | 'completed';
  session: {
    title: string;
    activity_type: string;
    distance?: number;
    duration?: number;
    scheduled_at: string;
  };
}
```

**Logique**:
- Fetch depuis `sessions` (organizer_id) + `session_participants` (user_id + status='confirmed')
- Limiter à 5 dernières activités
- Afficher: titre, type sport, distance, durée, date relative
- Style iOS card avec icône sport

### 2. Ajouter une section stats rapides

**Nouveau composant**: `src/components/profile/ProfileQuickStats.tsx`

```typescript
interface QuickStats {
  totalActivities: number;    // Count sessions created + joined
  totalDistance: number;       // Sum from sessions
  followerCount: number;
  followingCount: number;
}
```

**Affichage**: grille 2x2, chiffres grands (24px), labels petits (11px)

### 3. Restructurer Profile.tsx

**Ordre des sections**:
1. Cover + Avatar (keep)
2. Identity (nom, username, bio) + sports badges
3. **QuickStats** (nouveau)
4. Action buttons (follow/message si autre utilisateur)
5. **RecentActivities** (nouveau)
6. Routes & Sessions link
7. **Collapsible "Achievements"** section:
   - Badges débloqués
   - Records personnels
   - Classement & points

**Supprimer/déplacer**:
- `<StreakBadge>` → retirer complètement du profil principal
- Fiabilité (%) → retirer de la vue principale (garder dans settings si besoin admin)
- `<ActivityTimeline>` → retirer (doublons avec nouvelles activités)
- Clubs communs → retirer (info secondaire, déjà dans Messages)
- `<PersonalGoals>` → garder mais déplacer dans section achievements

### 4. Sports badges sous le username

Extraire les types de sport pratiqués depuis `running_records`, `cycling_records`, etc.

```typescript
const activeSports = [
  profile.running_records && Object.keys(profile.running_records).length > 0 ? '🏃 Running' : null,
  profile.cycling_records && Object.keys(profile.cycling_records).length > 0 ? '🚴 Cyclisme' : null,
  profile.swimming_records && Object.keys(profile.swimming_records).length > 0 ? '🏊 Natation' : null,
].filter(Boolean);
```

Afficher en chips sous le username.

### 5. Simplifier ProfilePreviewDialog.tsx

Appliquer la même structure:
- Hero (cover + avatar + identity)
- Quick stats
- Action buttons (follow)
- **Conditional content**:
  - Si `isFollowing`: Recent activities + achievements
  - Si non suivi: message "Suivez pour voir les activités"

### 6. Simplifier PublicProfile.tsx

Même structure minimaliste pour cohérence.

## Fichiers à modifier

1. **`src/components/profile/RecentActivities.tsx`** (nouveau)
   - Fetch + render liste d'activités
   - Chaque card: icône sport, titre, stats, date

2. **`src/components/profile/ProfileQuickStats.tsx`** (nouveau)
   - Grille 2x2: activités, distance, abonnés, abonnements
   - Requêtes Supabase pour compter/sommer

3. **`src/pages/Profile.tsx`**
   - Restructurer ordre des sections
   - Ajouter QuickStats et RecentActivities
   - Grouper badges/records/classement dans section "Achievements"
   - Retirer StreakBadge, ActivityTimeline, clubs communs, fiabilité principale

4. **`src/components/ProfilePreviewDialog.tsx`**
   - Appliquer même structure
   - Conditional: activities si following

5. **`src/pages/PublicProfile.tsx`**
   - Simplifier pour cohérence

6. **`src/components/profile/ProfileStatsGroup.tsx`**
   - Garder la structure (classement, points, badges, activités chart)
   - Mais renommer/repositionner pour clarté

## Ce qui ne change pas

- Style visuel iOS (cards, separators, inset grouped)
- Cover + avatar overlap design
- Follow/message logic
- Settings dialog
- Edit profile flow
- Realtime profile updates via UserProfileContext

## Bénéfices attendus

1. **Hiérarchie claire**: Stats → Activités → Achievements
2. **Lisibilité**: Informations essentielles en haut
3. **Inspiration Strava**: Focus sur l'activité sportive
4. **Mobile-friendly**: Moins de scroll, contenu prioritaire visible
5. **Cohérence**: Même structure pour Profile.tsx, ProfilePreviewDialog, PublicProfile

