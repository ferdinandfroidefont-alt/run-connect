

## Correction du bug de la barre de navigation

### Probleme identifie

Plusieurs composants appellent encore `setHideBottomNav(true)` ce qui masque la barre de navigation et peut la laisser cachee si le nettoyage ne se fait pas correctement :

1. **`SettingsDialog.tsx`** (ligne 76) : appelle `setHideBottomNav(open)` a l'ouverture
2. **`CreateClubDialogPremium.tsx`** (ligne 54) : appelle `setHideBottomNav(isOpen)` a l'ouverture

Selon les regles etablies, la barre de navigation doit etre visible partout sauf sur les ecrans de chargement et de connexion.

### Corrections prevues

**1. `src/components/SettingsDialog.tsx`**
- Supprimer le `useEffect` qui appelle `setHideBottomNav(open)` (lignes 75-78)
- Supprimer l'import de `setHideBottomNav` depuis `useAppContext`

**2. `src/components/CreateClubDialogPremium.tsx`**
- Supprimer le `useEffect` qui appelle `setHideBottomNav(isOpen)` (lignes 53-56)
- Supprimer l'import de `setHideBottomNav` depuis `useAppContext`

**3. `src/components/InteractiveMap.tsx`**
- Supprimer l'import inutilise de `setHideBottomNav` depuis `useAppContext` (ligne 159)

### Details techniques

Le composant `BottomNavigation` utilise `if (hideBottomNav) return null` pour se masquer. Si un composant met `hideBottomNav` a `true` et que le nettoyage (`return () => setHideBottomNav(false)`) ne s'execute pas correctement (ex: demontage non ordonne), la barre reste cachee indefiniment. La solution est de supprimer tous ces appels conformement a la regle : la barre doit toujours etre visible.
