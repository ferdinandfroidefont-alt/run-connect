

## Plan: Corriger les couleurs du logo SVG

### Probleme
Le fichier `public/logo-r.svg` contient 483 paths avec:
- **Fond**: couleur `#f2f3f9` et variantes proches (gris-bleuté) au lieu de `#FFFFFF` pur
- **Bleus du R**: nuances variées qui ne correspondent pas au bleu de l'app `#2072f7`

### Approche
Modifier directement le fichier `public/logo-r.svg` avec des remplacements de couleurs. Le SVG est un tracé vectoriel pixel-par-pixel avec ~480 paths colorés individuellement.

### Modifications dans `public/logo-r.svg`

**1. Fond → blanc pur**
Remplacer toutes les couleurs de fond (near-white/light gray) par `#FFFFFF`:
- `#f2f3f9`, `#edf2f3`, `#eff2f4`, `#e8ecf6`, `#dce8f8`, et variantes similaires proches du blanc

**2. Bleus du R → palette centrée sur #2072f7**
Remapper les couleurs bleues du R pour correspondre au bleu de l'app:
- Les bleus foncés (type `#1244d4`, `#2c3e8a`) → garder/ajuster vers `#1244d4` (dark)
- Les bleus moyens (type `#3a5bc7`, `#4a6dd4`, `#5b7cff`) → mapper vers `#2072f7` (primary)
- Les bleus clairs (type `#6b8cf0`, `#7b9ceb`, `#a8b8e9`) → mapper vers `#67abf8` (light)
- Les bleus très clairs (transition) → `#b9d1f1` / `#dce8f8`

**3. Aucune modification de l'animation**
Le fichier `LoadingScreen.tsx` ne change pas.

### Fichier modifié
- `public/logo-r.svg` uniquement (remplacements de couleurs fill)

