
Le user veut :
1. Supprimer tous les RPE dans la création de séance (SessionBlock.tsx)
2. Pour les blocs "interval" (série/fractionné), ajouter un concept de "blocs" en plus des "séries" :
   - Format : `{blocks} x {series} x {distance}` (ex: 2x3x500 = 2 blocs de 3 séries de 500m)
   - Renommer "Répétitions" → "Séries"
   - Ajouter "Blocs" (nombre de blocs)
   - Ajouter une "récup entre blocs" (différente de la récup entre séries)

## Plan

**1. `src/components/session-creation/types.ts`**
- Ajouter à `SessionBlock` :
  - `blockRepetitions?: number` (nombre de blocs, défaut 1)
  - `blockRecoveryDuration?: string` (récup entre blocs en secondes)
  - `blockRecoveryType?: 'trot' | 'marche' | 'statique'`
- Garder `repetitions` (= séries dans un bloc)

**2. `src/components/session-creation/SessionBlock.tsx`**
- Supprimer `RpeTenPicker` (composant + tous ses usages : warmup/cooldown/steady + interval)
- Pour les blocs `interval` :
  - Renommer label "Répétitions" → "Séries"
  - Ajouter un picker "Blocs" (1 à 10) à gauche/droite des séries
  - Ajouter un picker "Récup entre blocs" (durée + type) sous la récup entre séries, visible uniquement si `blockRepetitions > 1`
- Affichage type : `{blocks}×{series}×{distance}` quand blocks > 1, sinon `{series}×{distance}`

**3. `src/components/session-creation/SessionBlockBuilder.tsx`**
- Dans `addBlock('interval')`, retirer `rpe` et `recoveryRpe` du défaut, ajouter `blockRepetitions: 1`
- Retirer `rpe` des défauts warmup/cooldown/steady

**4. Pas de changement DB** : les champs sont stockés en JSON dans `session_blocks`, donc compatibles automatiquement.

Patch ciblé sur 3 fichiers, aucune migration nécessaire.
