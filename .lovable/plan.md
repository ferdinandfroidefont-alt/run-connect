

# Mode Coach — Plan d'implémentation

## Résumé

Transformer le système de coaching existant (basique : séances dans un onglet club) en un vrai **Mode Coach** où le coach crée des **séances modèle** (template) que chaque membre programme individuellement à son propre lieu et horaire. La séance apparaît ensuite sur la carte interactive.

---

## Ce qui existe déjà

- Tables `coaching_sessions`, `coaching_participations`, colonne `is_coach` sur `group_members`
- Composants `CoachingTab`, `CreateCoachingSessionDialog`, `CoachingSessionDetail`, `CoachBadge`
- Intégration dans `ClubInfoDialog` (onglet "Entraînements")

## Ce qui change (delta)

### 1. Base de données — Migration SQL

**Modifier `coaching_sessions`** : ajouter `session_blocks jsonb` (déjà dans le schéma), ajouter `coach_notes text` pour les consignes du coach.

**Modifier `coaching_participations`** : ajouter les colonnes pour que chaque membre programme sa propre séance :
- `scheduled_at timestamptz` — date/heure choisie par le membre
- `location_name text` — lieu choisi
- `location_lat numeric` — latitude
- `location_lng numeric` — longitude
- `map_session_id uuid` — lien vers la séance créée sur la carte (table `sessions`)

**Nouvelle colonne sur `sessions`** : `coaching_session_id uuid` → lien retour vers la séance coach d'origine, pour identifier les séances issues d'un plan coach.

RLS : les policies existantes couvrent déjà les cas nécessaires.

### 2. Bouton d'accès Coach dans Messages

Dans la grille de 5 boutons rapides (Profils, Contacts, Clubs, Strava, +Club) sur `Messages.tsx` :
- **Remplacer le bouton Strava** (peu utilisé dans ce contexte) ou **ajouter un 6e bouton** "Coach" avec emoji 🎓
- Ce bouton ouvre un dialog qui :
  1. Vérifie si l'utilisateur est coach dans au moins un club
  2. Si non : propose de créer un club d'abord ou de demander le rôle coach
  3. Si oui : affiche la liste de ses clubs où il est coach, puis ouvre `CreateCoachingSessionDialog` amélioré

### 3. Refonte `CreateCoachingSessionDialog`

Le dialog actuel est basique (titre, description, date, activité, distance, allure). Le transformer en **créateur de séance modèle** :

- **Étape 1** : Titre + Description + Notes du coach
- **Étape 2** : Type d'activité + Mode (simple / structuré via `SessionModeSwitch`)
- **Étape 3** : Si structuré → `SessionBlockBuilder` (réutilise les composants existants : échauffement, fractionné, récup, etc.)
- **Étape 4** : Distance cible + Allure cible (optionnels)
- **Pas de lieu ni date** — c'est le membre qui choisit

Le coach sélectionne le club cible, puis publie. Notification push envoyée aux membres.

### 4. Nouveau composant `ScheduleCoachingDialog`

Quand un membre reçoit/voit une séance coach, il clique "Programmer ma séance" :

- Choix du **lieu** (recherche Google Maps ou sélection sur la carte)
- Choix de la **date/heure**
- Crée une vraie entrée dans la table `sessions` (avec `coaching_session_id` lié) pour qu'elle apparaisse sur la carte
- Met à jour `coaching_participations` avec `scheduled_at`, `location_*`, `map_session_id`

### 5. Refonte `CoachingSessionDetail`

**Vue athlète** :
- Affiche les blocs structurés visuellement (réutilise `SessionBlockComponent`)
- Bouton "Programmer ma séance" → ouvre `ScheduleCoachingDialog`
- Si déjà programmée : affiche lieu + date + lien vers la séance sur la carte
- Bouton "Séance effectuée" + note athlète

**Vue coach** :
- Liste des membres avec statut : ⏳ Pas encore programmé / 📍 Programmé (lieu + date) / ✅ Fait
- Taux de complétion (barre de progression)
- Zone de feedback individuel par athlète

### 6. Intégration carte

Les séances créées via le mode coach apparaissent sur la carte comme des séances normales, mais avec un badge visuel "Coach" (petit 🎓 sur le marqueur). Le champ `coaching_session_id` sur `sessions` permet de les identifier.

### 7. Notifications

- Coach publie une séance → push à tous les membres du club
- Membre programme sa séance → notification au coach
- Coach envoie un feedback → push à l'athlète

---

## Fichiers impactés

| Fichier | Modification |
|---|---|
| `supabase/migrations/` | Nouvelle migration : colonnes sur `coaching_participations`, `sessions` |
| `src/integrations/supabase/types.ts` | Auto-régénéré |
| `src/components/coaching/CreateCoachingSessionDialog.tsx` | Refonte complète avec blocs structurés |
| `src/components/coaching/CoachingSessionDetail.tsx` | Refonte avec vue coach/athlète enrichie |
| `src/components/coaching/CoachingTab.tsx` | Ajout taux de complétion, meilleur affichage |
| `src/components/coaching/ScheduleCoachingDialog.tsx` | **Nouveau** — programmation lieu + date par le membre |
| `src/pages/Messages.tsx` | Ajout bouton Coach dans la grille rapide |
| `src/components/InteractiveMap.tsx` | Badge coach sur les marqueurs de séances coaching |

---

## Ordre d'implémentation

1. Migration SQL (colonnes `coaching_participations` + `sessions.coaching_session_id`)
2. Refonte `CreateCoachingSessionDialog` avec blocs structurés
3. Nouveau `ScheduleCoachingDialog` (membre programme lieu + date → crée `sessions`)
4. Refonte `CoachingSessionDetail` (vue coach avec taux complétion, vue athlète avec programmation)
5. Bouton Coach dans `Messages.tsx`
6. Badge coach sur la carte
7. Notifications push

