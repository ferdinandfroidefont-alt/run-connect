

## Fix: Espace entre la carte et la barre de navigation

### Cause racine identifiee
Le probleme vient de `env(safe-area-inset-bottom)` dans le padding du contenu principal. Sur iPhone avec home indicator, cela ajoute ~34px supplementaires au padding. Le calcul actuel:
- Padding du main = `60px + 34px (safe area) = 94px`
- Hauteur de la nav = `64px` (fixee en bas)
- **Gap visible = 30px**

La barre de navigation est en `fixed bottom-0` avec une hauteur de 64px sur iOS, mais elle ne s'etend pas dans la zone safe-area du bas. Le padding du contenu, lui, inclut cette zone safe-area, creant un espace vide entre la carte et la nav.

### Solution
Deux modifications:

1. **`src/components/BottomNavigation.tsx`**: Ajouter `pb-safe` a la nav pour qu'elle s'etende visuellement dans la zone du home indicator (sous les boutons).

2. **`src/components/Layout.tsx`**: Garder le padding avec safe-area mais ajuster la valeur de base pour correspondre exactement a la hauteur reelle de la nav (64px iOS + safe area couverte par la nav).

Concretement, la nav doit couvrir `64px + safe-area-inset-bottom`, et le padding du main doit etre identique: `calc(64px + env(safe-area-inset-bottom, 0px))`.

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/components/BottomNavigation.tsx` | Ajouter `pb-safe` a la nav pour couvrir le home indicator |
| `src/components/Layout.tsx` | Ajuster le padding par defaut a `calc(64px + safe-area)` |
| `src/index.css` | Mettre `.ios-nav-padding` a `calc(64px + safe-area)` pour correspondre exactement |

