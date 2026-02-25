

# Refonte du workflow Coach : Brouillons + Plan hebdo unifié

## Résumé

Remplacer le bouton "Nouvelle séance" par "Brouillons", supprimer la création de séance isolée, et transformer le Plan hebdo en outil principal avec : persistance des brouillons en base, barre de recherche d'athlètes, navigation par swipe entre semaines, et conservation des données après envoi.

## Analyse du code actuel

Le `CoachingTab` affiche 4 boutons : Nouvelle séance, Plan hebdo, Groupes, Suivi. Le `WeeklyPlanDialog` gère tout en mémoire (`groupPlans` state) — les données sont perdues à la fermeture. La création de séance individuelle (`CreateCoachingSessionDialog`) est un formulaire séparé.

## Architecture proposée

### 1. Nouvelle table `coaching_drafts`

```text
coaching_drafts
├── id          uuid PK
├── coach_id    uuid NOT NULL
├── club_id     uuid NOT NULL (ref conversations.id)
├── week_start  date NOT NULL
├── group_id    text DEFAULT 'club'
├── sessions    jsonb DEFAULT '[]'
├── target_athletes uuid[] DEFAULT '{}'
├── updated_at  timestamptz DEFAULT now()
├── created_at  timestamptz DEFAULT now()
│
└── UNIQUE(coach_id, club_id, week_start, group_id)
```

RLS : coach_id = auth.uid() pour SELECT/INSERT/UPDATE/DELETE.

### 2. CoachingTab — Remplacer les boutons

**Avant :**
```text
[+ Nouvelle séance] [Plan hebdo] [Groupes] [Suivi]
```

**Après :**
```text
[📝 Brouillons]  [📅 Plan hebdo]  [👥 Groupes]  [📊 Suivi]
```

- "Brouillons" ouvre une liste des brouillons existants (groupés par semaine/groupe) avec preview (nb séances, dernière modif)
- Cliquer un brouillon ouvre le `WeeklyPlanDialog` pré-rempli
- Supprimer le `CreateCoachingSessionDialog` du CoachingTab (la création passe uniquement par le Plan hebdo)

### 3. WeeklyPlanDialog — Modifications

#### 3a. Barre de recherche d'athlètes (en haut)

Ajouter un champ de recherche filtrable au-dessus de la grille de séances. Le coach tape un nom → filtre les membres du club → sélectionne ceux qu'il veut cibler pour cette semaine. Stocké dans `target_athletes` du brouillon.

```text
┌──────────────────────────────────┐
│ ← Retour    Plan de semaine     │
│ ┌──────────────────────────────┐ │
│ │ 🔍 Rechercher un athlète...  │ │
│ │ [Chip: Maxime] [Chip: Julie] │ │
│ └──────────────────────────────┘ │
│                                  │
│  SEMAINE  ◄ 2 Jun 2026 ►       │
│  [Lun] [Mar] [Mer] ...         │
```

#### 3b. Auto-save en brouillon

- À chaque modification (ajout/suppression/édition de séance), debounce 2s → upsert dans `coaching_drafts`
- Badge "Brouillon sauvegardé" discret en bas
- Au chargement du dialog, si un brouillon existe pour cette semaine/groupe → charger automatiquement

#### 3c. Conserver les données après envoi

Après `handleSendPlan()`, ne pas vider `groupPlans`. Mettre à jour le brouillon avec un flag visuel "Envoyé ✓" mais garder les données pour modification rapide et renvoi.

#### 3d. Swipe entre semaines

Utiliser les gestes tactiles (touch start/end) sur le conteneur principal pour naviguer entre semaines, en plus des boutons chevron existants.

### 4. Nouveau composant : DraftsList

Liste des brouillons pour un club donné, affichée quand on clique sur "Brouillons" :

```text
┌─────────────────────────────────┐
│ BROUILLONS                      │
│                                 │
│ 📝 Sem. 2 Jun · Club (3 séances)│
│    Modifié il y a 2h            │
│                                 │
│ 📝 Sem. 9 Jun · Sprint (5 séances)│
│    Modifié hier                 │
│                                 │
│ [+ Nouveau plan hebdo]          │
└─────────────────────────────────┘
```

Cliquer ouvre le WeeklyPlanDialog avec la bonne semaine, le bon groupe, et les séances pré-remplies.

## Fichiers modifiés

| Fichier | Changement |
|---------|-----------|
| Migration SQL | Créer table `coaching_drafts` avec RLS |
| `src/components/coaching/CoachingTab.tsx` | Remplacer "Nouvelle séance" par "Brouillons", supprimer `CreateCoachingSessionDialog` |
| `src/components/coaching/WeeklyPlanDialog.tsx` | Ajouter barre de recherche athlètes, auto-save brouillon, chargement auto, conserver données après envoi, swipe semaines |
| `src/components/coaching/CoachingDraftsList.tsx` | Nouveau composant — liste des brouillons |

## Détails techniques

- Auto-save : `useEffect` avec debounce 2s sur `groupPlans` → `supabase.from('coaching_drafts').upsert(...)` avec contrainte unique `(coach_id, club_id, week_start, group_id)`
- Chargement : au mount du WeeklyPlanDialog, `SELECT * FROM coaching_drafts WHERE coach_id = ? AND club_id = ? AND week_start = ?` → hydrate `groupPlans`
- Swipe : `onTouchStart`/`onTouchEnd` avec delta X > 50px → `setCurrentWeek(addWeeks/subWeeks)`
- Recherche athlètes : filtre local sur `members[]` avec `display_name.toLowerCase().includes(query)`

