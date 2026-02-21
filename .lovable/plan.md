

# Correction complete des couleurs Status Bar et Home Indicator sur toutes les pages

## Diagnostic

Le systeme actuel a **3 problemes** :

1. **Pas de `body::after` pour le Home Indicator** : seul `body::before` (Status Bar haut) existe dans `index.css`. La variable `--ios-bottom-color` est definie en JS mais jamais utilisee en CSS. Le bas n'est donc jamais colore dynamiquement.

2. **Couleurs hardcodees `#1d283a`** restantes dans :
   - `src/pages/Search.tsx` (ligne 51) : `--ios-top-color` en dur
   - `src/index.css` (ligne 450) : fallback `var(--ios-top-color, #1d283a)`

3. **Opacite sur le header de la carte** : `bg-card/95 backdrop-blur-sm` sur `InteractiveMap.tsx` (ligne 1381) cree une teinte legerement differente de `hsl(var(--card))` utilise pour la Status Bar.

## Plan de corrections

### 1. `src/index.css` -- Ajouter `body::after` et corriger le fallback

**Ligne 450** : Changer le fallback de `#1d283a` en `hsl(var(--background))`

**Apres ligne 453** : Ajouter `body::after` pour le Home Indicator :
```css
body::after {
  content: '';
  display: block;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: env(safe-area-inset-bottom, 0px);
  background-color: var(--ios-bottom-color, hsl(var(--background)));
  z-index: 9999;
  pointer-events: none;
}
```

### 2. `src/pages/Search.tsx` -- Supprimer la couleur en dur

**Ligne 51** : Remplacer `'#1d283a'` par `'hsl(var(--card))'` (la page Search a un fond `bg-card`)

### 3. `src/components/Layout.tsx` -- Supprimer la derniere couleur en dur

**Ligne 28** : Remplacer `'#1d283a'` par `'hsl(var(--background))'` pour la page Messages (ou la couleur appropriee selon le header de Messages)

### 4. `src/components/InteractiveMap.tsx` -- Rendre le header opaque

**Ligne 1381** : Remplacer `bg-card/95 backdrop-blur-sm` par `bg-card` pour que le header soit 100% opaque et corresponde exactement a la Status Bar

## Mapping final des couleurs par page

| Page | Status Bar (haut) | Home Indicator (bas) |
|------|-------------------|---------------------|
| Accueil `/` | `hsl(var(--card))` | `hsl(var(--background))` |
| Messages | `hsl(var(--background))` | `hsl(var(--secondary))` |
| Search | `hsl(var(--card))` | `hsl(var(--card))` |
| Loading Screen | `hsl(var(--secondary))` | `hsl(var(--secondary))` |
| Toutes les autres | `hsl(var(--background))` | `hsl(var(--background))` |

## Ce qui ne change pas

- Aucune modification de position ou de taille des barres
- Aucun mode immersif
- Aucune modification de la safe area ou des paddings
- Aucune modification du layout ou des composants

## Fichiers modifies

| Fichier | Changement |
|---------|-----------|
| `src/index.css` | Corriger fallback `body::before` + ajouter `body::after` pour Home Indicator |
| `src/pages/Search.tsx` | Remplacer `#1d283a` par `hsl(var(--card))` |
| `src/components/Layout.tsx` | Remplacer `#1d283a` par `hsl(var(--background))` |
| `src/components/InteractiveMap.tsx` | Remplacer `bg-card/95 backdrop-blur-sm` par `bg-card` |

