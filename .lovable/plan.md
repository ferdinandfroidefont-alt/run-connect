
## Correction ciblée de l’écran blanc iOS

### Cause identifiée
Le crash vient de `src/components/Layout.tsx` :
- un `useEffect` est déclaré **après** des retours conditionnels (`return null`, `return <Navigate />`, `return <ConsentDialog />`)
- selon l’état (`loading`, `profileLoading`, `user`), React exécute donc un nombre différent de hooks
- résultat : `Rendered more hooks than during the previous render.` puis écran blanc / fallback d’erreur, surtout visible sur iOS pendant le boot

Le build cassé est séparé :
- `src/lib/onScreenLogCapture.ts` utilise `replaceAll`, non compatible avec la config TS actuelle (`ES2020`)

### Plan de correction
1. **Stabiliser `Layout.tsx`**
   - remonter le `useEffect` de log “ready” avant tout `return`
   - garder la logique conditionnelle **dans** l’effet (`if (loading || profileLoading || !user) return`)
   - vérifier qu’aucun autre hook n’est placé après un `return`

2. **Supprimer les effets de bord pendant le render**
   - déplacer les `bootLog(...)` actuellement exécutés juste avant `return null`, `Navigate` ou `ConsentDialog`
   - les remplacer par des `useEffect` déclenchés sur changement d’état
   - objectif : éviter les warnings React du type “update while rendering” et réduire les flashs/blancs au chargement

3. **Corriger l’erreur de build TypeScript**
   - dans `escapeHtml`, remplacer :
     - `replaceAll("&", ...)`
     - `replaceAll("<", ...)`
     - `replaceAll(">", ...)`
   - par des `replace(/.../g, ...)`
   - c’est le correctif le plus sûr, sans élargir toute la cible TS juste pour un helper

4. **Validation attendue après correction**
   - plus d’erreur `Rendered more hooks...`
   - plus d’écran blanc persistant sur iOS
   - chargement normal sur web et iOS, avec fallback uniquement si une vraie erreur survient
   - build TypeScript vert

### Fichiers à modifier
- `src/components/Layout.tsx`
- `src/lib/onScreenLogCapture.ts`

### Détail technique
Le problème n’est pas “spécifique iOS” au niveau code : iOS l’expose davantage car le cycle de chargement y rend les transitions `loading -> ready` plus sensibles. La vraie racine est la règle React : **les hooks doivent être appelés dans le même ordre à chaque render**.
