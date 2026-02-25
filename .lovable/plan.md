

## Plan: Créateur de club = Coach automatiquement

### Contexte actuel
- A la creation d'un club, le createur est insere dans `group_members` avec `is_admin: true` mais `is_coach: false`
- Le `CoachAccessDialog` fait un fallback sur `created_by` pour trouver les clubs du createur, mais c'est un contournement
- Le `ClubInfoDialog` a une logique hybride: `is_coach || is_admin || createdBy === user?.id`
- La fonction SQL `is_club_coach_or_creator` gere deja le cas au niveau RLS (verifie `created_by` OU `is_coach`)

### Changements prevus

**1. Lors de la creation du club, mettre `is_coach: true` en plus de `is_admin: true`**

Fichiers concernes:
- `src/components/CreateClubDialog.tsx` (ligne ~296): ajouter `is_coach: true` dans l'insert `group_members`
- `src/components/CreateClubDialogPremium.tsx` (ligne ~236): idem

**2. Simplifier `CoachAccessDialog.loadCoachClubs()`**

- Supprimer le fallback `created_by` (lignes 70-78) car le createur aura desormais `is_coach: true` dans `group_members`
- Garder uniquement la query `is_coach = true`

**3. Simplifier `ClubInfoDialog` la detection coach**

- La logique `currentUserIsCoach` (ligne ~189) peut rester telle quelle car elle gere deja les cas anciens (`is_admin || createdBy`), ce qui assure la retro-compatibilite avec les clubs existants

**4. (Optionnel) Mettre a jour les clubs existants**

- Executer un UPDATE SQL pour mettre `is_coach = true` sur les `group_members` des createurs de clubs existants, afin d'aligner les donnees historiques

### Details techniques

```text
CreateClubDialog / CreateClubDialogPremium
  insert group_members:
    AVANT:  { is_admin: true }
    APRES:  { is_admin: true, is_coach: true }

CoachAccessDialog.loadCoachClubs():
  AVANT:  query is_coach=true, fallback created_by
  APRES:  query is_coach=true uniquement

SQL migration (donnees existantes):
  UPDATE group_members gm
  SET is_coach = true
  FROM conversations c
  WHERE gm.conversation_id = c.id
    AND c.is_group = true
    AND c.created_by = gm.user_id
    AND gm.is_coach = false;
```

### Fichiers modifies
1. `src/components/CreateClubDialog.tsx` - ajouter `is_coach: true`
2. `src/components/CreateClubDialogPremium.tsx` - ajouter `is_coach: true`
3. `src/components/coaching/CoachAccessDialog.tsx` - simplifier `loadCoachClubs`
4. Migration SQL - aligner les donnees existantes

