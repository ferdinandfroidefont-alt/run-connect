

# Fix: Clic sur un profil dans la recherche ne s'ouvre pas

## Cause
La page Search est un overlay `fixed` à `z-[60]`. Le `ProfilePreviewDialog` utilise un Dialog Radix à `z-50`. Le dialog s'ouvre **derrière** l'overlay de recherche, donc invisible.

## Solution
Plutôt que de bidouiller les z-index, naviguer directement vers la page profil (`/profile/${userId}`) quand on clique sur un résultat dans la recherche. C'est plus naturel et cohérent avec le reste de l'app.

## Changements

### `src/components/search/ProfilesTab.tsx`
- Remplacer `handleProfileClick` pour faire `navigate(`/profile/${userId}`)` au lieu d'utiliser `useProfileNavigation` et le `ProfilePreviewDialog`
- Retirer les imports/usage de `useProfileNavigation` et `ProfilePreviewDialog`
- Retirer le rendu du `ProfilePreviewDialog` en bas du composant

