

# Fix: "new row violates row-level security policy" pour `club_groups`

## Diagnostic

Le `conversationId` passé est `9bb873a7-4f0f-4dcb-8349-ba94780a196c` (club "Ferdi"). Le user `0f464761-...` est le `created_by` de cette conversation, mais n'a **aucune entrée dans `group_members`** pour ce club.

La fonction `is_club_coach_or_creator` retourne `true` quand on la teste directement (car elle vérifie `conversations.created_by`). Cependant, le problème vient du `.select()` chaîné après l'INSERT dans le code.

Quand on fait `.insert({...}).select()`, Supabase exécute :
1. INSERT → vérifié par la policy `WITH CHECK (is_club_coach_or_creator(...))` → OK
2. SELECT sur la row insérée → vérifié par `USING (is_club_member(...))` → **ÉCHEC**

La policy SELECT utilise `is_club_member` qui vérifie uniquement `group_members`, et le user n'y est pas. Donc l'INSERT réussit mais le SELECT retourne une erreur.

## Deux corrections

### 1. `ClubGroupsManager.tsx` — Retirer le `.select()` inutile

Le `.select()` n'est pas nécessaire ici car on fait `loadData()` juste après. Le retirer évite le problème SELECT.

### 2. RLS SELECT policy — Autoriser aussi le créateur du club

C'est la vraie correction de fond. Le créateur du club devrait pouvoir voir les groupes même s'il n'est pas dans `group_members`. Modifier la policy SELECT de `club_groups` :

```sql
DROP POLICY "Club members can view groups" ON club_groups;
CREATE POLICY "Club members can view groups" ON club_groups
  FOR SELECT TO public
  USING (is_club_member(auth.uid(), club_id) OR is_club_coach_or_creator(auth.uid(), club_id));
```

Cela couvre le cas où le créateur n'est pas dans `group_members`.

## Aussi: ajouter le créateur dans `group_members`

Le fait que le créateur du club ne soit pas dans `group_members` est un bug de données. On devrait aussi s'assurer que la création de club ajoute bien le créateur. Mais c'est un problème séparé — les deux corrections ci-dessus règlent le problème immédiat.

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/components/coaching/ClubGroupsManager.tsx` | Retirer `.select()` de l'insert |
| Migration SQL | Modifier la policy SELECT de `club_groups` pour inclure `is_club_coach_or_creator` |

