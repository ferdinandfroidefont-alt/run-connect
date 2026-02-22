

## Remonter les elements juste sous la barre

La barre du haut fait 44px (`h-11`). Les elements (toggle Guide/Manuel, outils droits, stats) sont actuellement a `top-14` (56px), soit 12px sous la barre. On les remonte a `top-12` (48px), soit seulement 4px sous la barre.

### Modifications dans `src/pages/RouteCreation.tsx`

- **Ligne 694** : changer `top-14` en `top-12` (toggle Guide / Manuel)
- **Ligne 721** : changer `top-14` en `top-12` (outils lateraux droits)
- **Ligne 768** : changer `top-14` en `top-12` (stats flottantes)

