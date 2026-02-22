

## Corrections a appliquer

### 1. Ajouter le `<Layout>` autour de la route `/route-create` (App.tsx)

Les routes `/route-create` et `/route-creation` (lignes 70-71) ne sont pas enveloppees dans `<Layout>`, donc la barre de navigation n'apparait pas. Il faut les envelopper comme les autres routes :

```
<Route path="/route-create" element={<Layout><PageTransition><RouteCreation /></PageTransition></Layout>} />
<Route path="/route-creation" element={<Layout><PageTransition><RouteCreation /></PageTransition></Layout>} />
```

### 2. Remonter le toggle "Guide / Manuel" juste sous la barre du haut (RouteCreation.tsx)

Actuellement a `top-24` (ligne 694), il faut le remonter a `top-14` pour qu'il soit juste sous la barre de navigation compacte (qui fait 44px de haut).

### 3. Remonter les outils lateraux droits au meme niveau (RouteCreation.tsx)

Les boutons de droite (recentrer, undo, redo, supprimer) sont aussi a `top-24` (ligne 721). Les remonter a `top-14` pour etre alignes avec le toggle de gauche.

### 4. Remonter les stats flottantes (RouteCreation.tsx)

La barre de stats (distance, D+, D-) est aussi a `top-24` (ligne 768). La remonter a `top-14` egalement.

### 5. Retirer le `fixed inset-0` et `pb-[64px]` du conteneur principal (RouteCreation.tsx)

Puisque la page sera desormais dans `<Layout>` qui gere deja le padding pour la barre de navigation, le conteneur principal doit utiliser `h-full relative` au lieu de `fixed inset-0 pb-[64px]` pour eviter les conflits de positionnement.

### Details techniques

- **Fichier `src/App.tsx`** : lignes 70-71, ajouter `<Layout>` autour des deux routes
- **Fichier `src/pages/RouteCreation.tsx`** :
  - Ligne 637 : changer `fixed inset-0 ... pb-[64px]` en `h-full relative`
  - Ligne 694 : changer `top-24` en `top-14`
  - Ligne 721 : changer `top-24` en `top-14`
  - Ligne 768 : changer `top-24` en `top-14`

