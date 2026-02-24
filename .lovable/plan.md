

# Bouton d'accès à la vue Athlète en dehors du coaching club

## Constat

Actuellement, l'`AthleteWeeklyView` n'est accessible que depuis l'onglet "Entraînements" du `ClubInfoDialog`. Un athlète doit :
1. Aller dans Messages
2. Ouvrir un club
3. Cliquer sur l'onglet "Entraînements"

C'est trop enfoui. Il faut un accès rapide depuis la page **Mes Séances** (`MySessions`).

## Solution

Ajouter un **bandeau "Mon plan coaching"** en haut de la page `MySessions.tsx` qui apparaît uniquement si l'athlète a des `coaching_participations` actives. Au clic, il ouvre un **dialog fullscreen** avec l'`AthleteWeeklyView`.

```text
┌─────────────────────────────────┐
│  MES SÉANCES                     │
│                                   │
│  ┌─────────────────────────────┐ │
│  │ 🏋️ Mon plan coaching        │ │
│  │ Club Ferdi · 2/5 cette sem. > │
│  └─────────────────────────────┘ │
│                                   │
│  [Créées]  [Rejointes]            │
│  ... liste séances normales ...   │
└─────────────────────────────────┘
```

## Fichiers impactés

### 1. `src/components/coaching/AthleteWeeklyDialog.tsx` — Nouveau

Dialog fullscreen (style sheet/drawer) qui encapsule `AthleteWeeklyView` + `CoachingSessionDetail` pour la navigation interne. Props : `isOpen`, `onClose`, `clubId`, `clubName`.

### 2. `src/pages/MySessions.tsx` — Modifier

- Au montage, requête pour vérifier si l'athlète a des `coaching_participations` récentes. Si oui, récupérer le `club_id` et le nom du club.
- Afficher un bandeau cliquable en haut (avant la liste des séances) qui ouvre `AthleteWeeklyDialog`.
- Le bandeau affiche : nom du club + nombre de séances complétées cette semaine.
- Si l'athlète est dans plusieurs clubs coaching, afficher un bandeau par club.

### 3. Aucune migration SQL

Les données existent déjà dans `coaching_participations` et `coaching_sessions`.

## Détails techniques

**Requête pour détecter les clubs coaching de l'athlète :**
```sql
SELECT DISTINCT cs.club_id, c.name
FROM coaching_participations cp
JOIN coaching_sessions cs ON cs.id = cp.coaching_session_id
JOIN conversations c ON c.id = cs.club_id
WHERE cp.user_id = auth.uid()
  AND cs.scheduled_at >= now() - interval '30 days'
```

**Bandeau UI :** IOSListItem avec icône Dumbbell, titre du club, sous-titre "X/Y séances cette semaine", chevron droit. Style card iOS standard.

