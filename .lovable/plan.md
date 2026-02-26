

## Plan : 3 corrections

### 1. Infinite recursion RLS sur `group_members`

**Cause** : La politique UPDATE `"Group creators can update member roles"` sur `group_members` fait un sous-query vers `conversations` qui elle-meme a un SELECT policy qui query `group_members` → boucle infinie.

**Fix** : Remplacer cette policy par une version utilisant une fonction `SECURITY DEFINER` qui bypass RLS.

```sql
-- Créer une fonction SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_group_creator(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversations
    WHERE id = _conversation_id AND created_by = _user_id AND is_group = true
  );
$$;

-- Remplacer la policy
DROP POLICY "Group creators can update member roles" ON group_members;
CREATE POLICY "Group creators can update member roles" ON group_members
  FOR UPDATE TO authenticated
  USING (is_group_creator(auth.uid(), conversation_id));
```

Faire pareil pour les policies INSERT et DELETE de `group_members` qui utilisent le meme sous-query vers `conversations`.

### 2. Supprimer le mode partagé

Les coachs sont toujours indépendants. Supprimer :

- **`ClubInfoDialog.tsx`** : Retirer le state `coachingMode`, l'effet de chargement, la fonction `updateCoachingMode`, et le bloc UI du sélecteur "Mode coaching" (lignes 91-114, 524-556)
- **`WeeklyPlanDialog.tsx`** : Retirer les queries de `coaching_mode`, toujours filtrer par `coach_id = user.id`
- **`CoachingDraftsList.tsx`** : Idem, toujours filtrer par `coach_id = user.id`
- **`CoachingTab.tsx`** : Retirer toute logique de `coaching_mode` si présente

La colonne DB et les RLS policies restent (pas de breaking change), mais le frontend ne l'utilise plus.

### 3. LocationStep sans carte — "Ma position" et "Centre carte"

**Problème** : `CoachingSessionDetail` ouvre `CreateSessionWizard` avec `map={null}`. Les boutons "Ma position" et "Centre carte" dans `LocationStep` sont conditionnés à `map` existant (disabled quand `!map`, et actions qui font `map.setCenter()`).

**Fix dans `LocationStep.tsx`** :
- **"Ma position"** : Ne plus dépendre de `map`. Utiliser directement `navigator.geolocation.getCurrentPosition()`, faire un reverse geocode, et appeler `onLocationSelect()` sans centrer la carte.
- **"Centre carte"** : Masquer ce bouton quand `map` est null (il n'a pas de sens sans carte).
- S'assurer que les boutons sont toujours visibles quand `map` est null en enlevant le `disabled={!map}` implicite.

