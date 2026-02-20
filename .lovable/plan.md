
# Supprimer le double padding safe area en bas

## Probleme
Apres l'ajout de `pb-safe` a la fois sur le conteneur racine de `Layout.tsx` ET sur `BottomNavigation.tsx`, il y a maintenant **deux zones de padding** en bas de l'ecran sur iPhone : une venant du Layout, une venant de la BottomNavigation. Cela cree une double barre visible.

## Cause
- `Layout.tsx` ligne 79 : `pb-safe` sur le div racine
- `BottomNavigation.tsx` ligne 70 : `pb-safe` sur la nav

Les deux appliquent `padding-bottom: env(safe-area-inset-bottom)`, ce qui double l'espace en bas.

## Solution
Retirer `pb-safe` du conteneur racine de `Layout.tsx`. La logique est :
- **Quand la nav est visible** : c'est `BottomNavigation` qui gere la safe area (elle a deja `pb-safe`)
- **Quand la nav est masquee** : les pages standalone (Auth, Search, etc.) gerent elles-memes la safe area avec leur propre `pb-safe`

## Fichier modifie

### `src/components/Layout.tsx`
- Ligne 79 : retirer `pb-safe` de la classe du div racine
- Passe de `"h-screen-safe bg-background flex flex-col bg-pattern overflow-x-hidden overflow-y-hidden pb-safe"` a `"h-screen-safe bg-background flex flex-col bg-pattern overflow-x-hidden overflow-y-hidden"`
