

# Fusion Tab Bar + Home Indicator en un seul bloc

## Probleme

Deux elements se superposent en bas :
1. `BottomNavigation` (`bg-background backdrop-blur-xl` + ligne separatrice `h-px bg-border/50`)
2. `body::after` overlay (safe area bottom, `z-index: 40`)

Meme si les couleurs sont proches, le `backdrop-blur-xl` et la ligne de separation creent une rupture visuelle = "double bande".

## Solution

### A) Variable unique `--tabbar-bg`

Definir dans `:root` et `.dark` une variable HEX fixe :
- Light mode : `--tabbar-bg: #edf1f5;` (valeur calculee de `hsl(209, 40%, 96%)` = le background actuel)
- Dark mode : `--tabbar-bg: #172033;` (valeur calculee de `hsl(222, 47%, 11%)`)

### B) BottomNavigation (`src/components/BottomNavigation.tsx`)

Ligne 70, remplacer :
```
bg-background backdrop-blur-xl
```
par un style inline utilisant la variable + ajouter `padding-bottom: env(safe-area-inset-bottom)` pour que la nav elle-meme s'etende dans la zone Home Indicator :
```
style={{ backgroundColor: 'var(--tabbar-bg)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
```

Ligne 71, supprimer la ligne separatrice :
```
<div className="h-px bg-border/50" />
```
Supprimee entierement.

### C) `body::after` defaut (`src/index.css`)

Changer le fallback de `body::after` pour utiliser `--tabbar-bg` au lieu de `hsl(var(--background))` :
```
background-color: var(--safe-bottom-bg, var(--tabbar-bg));
```

Ainsi, quand la nav est visible (pas d'override `--safe-bottom-bg`), le home indicator a exactement la meme couleur HEX que la tab bar = zero ecart.

### D) Pages avec override (conversation, loading, search)

Aucun changement : elles definissent `--safe-bottom-bg: #465467` explicitement, donc l'overlay utilisera cette couleur. Sur ces pages la bottom nav est soit cachee (conversation, loading), soit le design demande un fond different (search).

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/index.css` | Ajouter `--tabbar-bg` dans `:root` et `.dark`. Modifier `body::after` fallback. |
| `src/components/BottomNavigation.tsx` | Style inline avec `--tabbar-bg`, supprimer `backdrop-blur-xl`, supprimer la ligne separatrice, ajouter `paddingBottom: env(safe-area-inset-bottom)`. |

Aucun fichier cree. Aucun deplacement de boutons. Taille et position des icones inchangees.

