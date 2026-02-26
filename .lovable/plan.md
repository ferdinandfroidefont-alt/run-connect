

## Plan : Auto-coaching, multi-coachs et modes partagé/indépendant

### Contexte actuel

1. **Auto-coaching impossible** : `WeeklyPlanDialog.loadMembers()` (ligne 257) exclut le coach courant via `p.user_id !== user?.id`. Le coach ne se voit jamais comme athlète.

2. **Multi-coachs** : La colonne `is_coach` existe dans `group_members`, et l'admin peut promouvoir des coachs via `ClubInfoDialog`. Cependant, chaque coach ne voit que ses propres sessions (`coach_id = user.id` dans toutes les requêtes).

3. **Pas de notion de mode coaching** : Aucun champ ne distingue "partagé" vs "indépendant" sur le club.

---

### Modifications base de données

**Migration : Ajouter `coaching_mode` à `conversations`**

```sql
ALTER TABLE conversations 
  ADD COLUMN coaching_mode text NOT NULL DEFAULT 'shared';
-- Valeurs : 'shared' (coachs partagent tout) ou 'independent' (chacun ses athlètes)
```

**Migration : Mise à jour des politiques RLS pour `coaching_sessions`**

En mode partagé, tout coach du club peut UPDATE/DELETE les sessions des autres coachs :
- Modifier la politique UPDATE pour autoriser `is_club_coach_or_creator(auth.uid(), club_id)` en plus de `coach_id = auth.uid()`
- Modifier la politique DELETE de la même façon
- Conditionner cela sur `coaching_mode = 'shared'` via la table `conversations`

---

### Modifications frontend

#### 1. Auto-coaching (coach = aussi athlète)

**Fichiers touchés :**
- `WeeklyPlanDialog.tsx` ligne 257 : Supprimer le filtre `.filter(p => p.user_id !== user?.id)` pour que le coach apparaisse dans la liste des athlètes
- `WeeklyTrackingView.tsx` : Même correction — le coach doit apparaître dans le suivi athlètes
- `CoachingTab.tsx` : Afficher **les deux vues** (coach + athlète) quand l'utilisateur est coach. Actuellement c'est `isCoach ? coachView : athleteView`. Il faut montrer le dashboard coach + la vue athlète en dessous

#### 2. Réglage du mode coaching par l'admin

**Fichier : `ClubInfoDialog.tsx` ou `ClubProfileDialog.tsx`**
- Ajouter un sélecteur "Mode coaching" dans les paramètres du club (admin only)
- Deux options avec description :
  - **Partagé** : "Les coachs partagent les programmes et le suivi. Chacun peut voir et modifier le travail des autres."
  - **Indépendant** : "Chaque coach gère ses propres athlètes et programmes de façon autonome."
- Mise à jour de `conversations.coaching_mode` via Supabase

#### 3. Mode partagé vs indépendant — logique de filtrage

**`WeeklyPlanDialog.tsx` :**
- Charger le `coaching_mode` du club au montage
- Mode **partagé** : `loadSentSessions()` ne filtre plus par `coach_id` — affiche toutes les sessions du club pour la semaine
- Mode **indépendant** : garde le filtre actuel `coach_id = user.id`
- Idem pour `loadPreviousWeek()`, `loadDraft()`

**`WeeklyTrackingView.tsx` :**
- Mode **partagé** : afficher tous les athlètes et toutes les participations, quel que soit le coach qui a créé la session
- Mode **indépendant** : filtrer les sessions par `coach_id = user.id`

**`CoachingTab.tsx` :**
- Charger le `coaching_mode`
- Mode **partagé** : le dashboard agrège toutes les sessions de tous les coachs
- Mode **indépendant** : n'affiche que les stats des sessions du coach courant

**`CoachingDraftsList.tsx` :**
- Mode **partagé** : afficher les brouillons de tous les coachs du club
- Mode **indépendant** : seulement les brouillons du coach courant

#### 4. RLS backend pour le mode partagé

Créer une fonction SQL `get_club_coaching_mode(club_id uuid)` en `SECURITY DEFINER` :

```sql
CREATE OR REPLACE FUNCTION get_club_coaching_mode(_club_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(coaching_mode, 'shared')
  FROM conversations
  WHERE id = _club_id
$$;
```

Modifier la politique UPDATE de `coaching_sessions` :

```sql
DROP POLICY "Coaches can update their coaching sessions" ON coaching_sessions;
CREATE POLICY "Coaches can update their coaching sessions" ON coaching_sessions
FOR UPDATE USING (
  auth.uid() = coach_id
  OR (
    get_club_coaching_mode(club_id) = 'shared'
    AND is_club_coach_or_creator(auth.uid(), club_id)
  )
);
```

Idem pour DELETE.

---

### Résumé des fichiers impactés

| Fichier | Changement |
|---|---|
| Migration SQL | `coaching_mode` sur `conversations` + RLS update |
| `WeeklyPlanDialog.tsx` | Supprimer filtre `!== user.id` dans membres, conditionner `coach_id` filter |
| `WeeklyTrackingView.tsx` | Conditionner le filtrage par coach_id |
| `CoachingTab.tsx` | Montrer coach + athlète view ensemble, charger coaching_mode |
| `CoachingSessionDetail.tsx` | Autoriser l'édition pour les co-coachs en mode partagé |
| `ClubInfoDialog.tsx` | Ajouter sélecteur de mode coaching |
| `CoachingDraftsList.tsx` | Conditionner l'affichage des brouillons |
| Fonction SQL | `get_club_coaching_mode()` + MAJ policies |

