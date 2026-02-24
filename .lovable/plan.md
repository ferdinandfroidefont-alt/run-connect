

# Vue Suivi Hebdo Athlète — Cocher ses séances + Commentaires

## Constat actuel

Côté **athlète**, le `CoachingTab` affiche une simple liste de séances cliquables. Pour marquer une séance comme faite, l'athlète doit :
1. Cliquer sur la séance → ouvrir `CoachingSessionDetail`
2. Écrire un commentaire dans un textarea
3. Cliquer "Marquer comme fait"

C'est trop de clics. L'athlète devrait voir sa semaine d'un coup et cocher directement.

## Ce qu'on va construire

Une **vue semaine athlète** intégrée directement dans le `CoachingTab` (quand `!isCoach`), avec :

```text
┌──────────────────────────────────┐
│  MA SEMAINE                       │
│  23 fév – 1 mars         3/5 ✅  │
│                                   │
│  ┌────────────────────────────┐   │
│  │ ☑ Lun — Seuil 3x1000      │   │
│  │   "Bonnes sensations"  ✏️  │   │
│  ├────────────────────────────┤   │
│  │ ☑ Mar — EF 45'             │   │
│  │   Pas de commentaire   ✏️  │   │
│  ├────────────────────────────┤   │
│  │ ☐ Mer — VMA 10x200        │   │
│  │   [Cocher + commenter]     │   │
│  ├────────────────────────────┤   │
│  │ ☐ Ven — Seuil long        │   │
│  │   Pas encore fait          │   │
│  ├────────────────────────────┤   │
│  │ ☐ Sam — Sortie longue     │   │
│  │   Pas encore fait          │   │
│  └────────────────────────────┘   │
│                                   │
│  Progression : ████████░░░ 60%    │
└──────────────────────────────────┘
```

Chaque séance :
- **Checkbox** pour cocher "fait" directement (update `coaching_participations.status` → `completed`)
- **Zone commentaire** inline (expand au clic sur ✏️) pour `athlete_note`
- **Clic sur le titre** → ouvre `CoachingSessionDetail` pour voir les détails complets
- **Barre de progression** en bas avec le % de complétion

## Changements fichier par fichier

### 1. `src/components/coaching/CoachingTab.tsx`

Remplacer la section athlete (`!isCoach && sessions.length > 0`) par un nouveau composant `AthleteWeeklyView`.

La section actuelle (lignes 248-261) qui affiche juste une liste `IOSListItem` sera remplacée par :
```tsx
<AthleteWeeklyView 
  clubId={clubId} 
  sessions={sessions} 
  onSessionClick={(s) => setSelectedSession(s)} 
/>
```

### 2. `src/components/coaching/AthleteWeeklyView.tsx` — Nouveau composant

Composant qui :
- Prend les sessions de la semaine + les participations de l'athlète courant
- Affiche chaque séance comme un item iOS avec :
  - Checkbox (Radix `Checkbox`) à gauche
  - Titre + jour au centre
  - Bouton ✏️ pour expand un `Textarea` de commentaire
- Au clic checkbox → update `coaching_participations` (status → `completed`, `completed_at` → now)
- Au clic ✏️ → toggle textarea inline, auto-save `athlete_note` au blur
- Barre `Progress` en bas avec le taux de complétion
- Notification push au coach quand l'athlète coche une séance

Requêtes Supabase :
- `coaching_participations` WHERE `user_id = auth.uid()` AND `coaching_session_id IN (sessionIds)` → SELECT
- UPDATE `status`, `completed_at`, `athlete_note` → utilise la policy existante "Athletes can update their own participation"

Pas de migration SQL nécessaire — toutes les colonnes existent déjà (`status`, `completed_at`, `athlete_note`).

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/components/coaching/AthleteWeeklyView.tsx` | Créer — vue semaine athlète avec checkboxes et commentaires |
| `src/components/coaching/CoachingTab.tsx` | Modifier — remplacer la liste simple par `AthleteWeeklyView` |

Aucune migration SQL. Les policies RLS existantes couvrent déjà les updates athlète.

