

# Système de Coaching dans les Clubs

## Concept

Enrichir le système de clubs existant avec des fonctionnalités de coaching. Le créateur d'un club (ou un membre promu "coach") peut publier des **séances d'entraînement planifiées** visibles uniquement par les membres du club, suivre leur participation, et donner un **feedback** individuel. Tout utilisateur peut activer ce rôle.

## Architecture

### Nouvelles tables Supabase

**1. `coaching_sessions`** — Séances planifiées par le coach dans un club

| Colonne | Type | Description |
|---|---|---|
| id | uuid PK | |
| club_id | uuid FK → conversations.id | Club concerné |
| coach_id | uuid | Créateur de la séance |
| title | text | Titre (ex: "Fractionné 10x400m") |
| description | text | Consignes détaillées |
| scheduled_at | timestamptz | Date/heure prévue |
| activity_type | text | course, vélo, etc. |
| distance_km | numeric | Distance prévue (optionnel) |
| pace_target | text | Allure cible (optionnel) |
| session_blocks | jsonb | Blocs structurés (réutilise le format existant) |
| status | text | planned / completed / cancelled |
| created_at | timestamptz | |

**2. `coaching_participations`** — Participation + feedback

| Colonne | Type | Description |
|---|---|---|
| id | uuid PK | |
| coaching_session_id | uuid FK | |
| user_id | uuid | Athlète |
| status | text | confirmed / completed / absent |
| feedback | text | Feedback du coach (nullable) |
| athlete_note | text | Note de l'athlète (comment ça s'est passé) |
| completed_at | timestamptz | |
| created_at | timestamptz | |

**3. Modification de `group_members`** — Ajouter un rôle coach

Ajouter une colonne `is_coach boolean DEFAULT false` à la table `group_members`.

### RLS Policies

- **coaching_sessions** : SELECT pour les membres du club ; INSERT/UPDATE/DELETE pour les coachs du club
- **coaching_participations** : SELECT pour membres du club ; INSERT pour les membres (s'inscrire) ; UPDATE pour le coach (feedback) ou l'athlète (sa note)
- **group_members.is_coach** : UPDATE uniquement par le créateur du club

### Nouveaux composants

**1. `CoachingTab.tsx`** — Onglet dans `ClubInfoDialog` ou vue dédiée dans la conversation de club

- Liste des séances planifiées (prochaines en haut)
- Bouton "Créer une séance" (visible uniquement pour les coachs)
- Chaque séance : titre, date, activité, nombre d'inscrits
- Clic → détail avec liste des inscrits et zone de feedback

**2. `CreateCoachingSessionDialog.tsx`** — Dialog de création

- Champs : titre, description, date/heure, type d'activité, distance, allure cible
- Option blocs structurés (réutilise `SessionBlock` existant)
- Bouton publier → insère dans `coaching_sessions` + envoie notification aux membres du club

**3. `CoachingSessionDetail.tsx`** — Détail d'une séance coaching

- Vue coach : liste des participants avec statut, zone de feedback individuel
- Vue athlète : consignes, bouton "Je participe" / "Fait", zone pour écrire sa note
- Historique des séances passées

**4. `CoachBadge.tsx`** — Badge "Coach" affiché dans la liste des membres du club

### Modifications existantes

**`ClubInfoDialog.tsx`** :
- Ajouter un onglet "Entraînements" entre les membres et les infos
- Bouton pour promouvoir un membre en coach (admin seulement)

**`Messages.tsx`** (vue conversation de club) :
- Ajouter un bouton raccourci en haut ou dans le menu "..." pour accéder aux séances coaching du club

**`BottomNavigation.tsx`** : Aucun changement (les séances coaching sont accessibles via le club)

### Flux utilisateur

```text
Club existant
  └─ Menu "..." ou onglet "Entraînements"
       ├─ [Coach] → "Créer une séance"
       │    └─ Formulaire → Publie → Notifie les membres
       ├─ Liste des séances à venir
       │    └─ Clic → Détail
       │         ├─ [Athlète] "Je participe" / "Fait" + note
       │         └─ [Coach] Feedback individuel par athlète
       └─ Historique des séances passées
```

### Notifications

- Nouvelle séance coaching publiée → push aux membres du club
- Feedback du coach → push à l'athlète concerné
- Rappel avant séance (optionnel, via cron)

### Étapes d'implémentation

1. **Migration SQL** : créer `coaching_sessions`, `coaching_participations`, ajouter `is_coach` à `group_members`, RLS policies
2. **Composants UI** : `CoachingTab`, `CreateCoachingSessionDialog`, `CoachingSessionDetail`, `CoachBadge`
3. **Intégration** : modifier `ClubInfoDialog` pour l'onglet coaching, modifier la vue conversation club pour l'accès rapide
4. **Notifications** : réutiliser `useSendNotification` pour notifier les membres
5. **Traductions** : ajouter les clés FR/EN dans `translations.ts`

### Points techniques

- Réutilise le format `session_blocks` (jsonb) déjà utilisé dans `sessions` pour les blocs structurés
- Le rôle coach est par club (un utilisateur peut être coach dans un club et simple membre dans un autre)
- Le créateur du club est automatiquement coach
- Pas de nouvelle page : tout est intégré dans l'écosystème clubs existant

