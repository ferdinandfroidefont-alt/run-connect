

# Correction iOS : Status Bar dynamique + Home Indicator unique + couleurs

## Problemes identifies

1. **Home Indicator double** : `BottomNavigation` a `paddingBottom: env(safe-area-inset-bottom)` en inline style, ce qui etend la nav vers le bas. MAIS la zone derriere cette extension est du `bg-background` (couleur claire) et non la couleur souhaitee. De plus, le contenu principal a deja un `pb-[64px]` qui laisse un vide visible.

2. **Status Bar couleur statique** : Le `body::before` dans `index.css` a un fond hardcode `#1d283a`. Il faut le rendre dynamique via une variable CSS `--ios-top-color`.

3. **Home Indicator couleurs jamais appliquees** : La variable `--ios-bottom-color` est definie sur `documentElement` mais plus rien ne la lit (le `body::after` a ete supprime dans la correction precedente).

## Solution

### Strategie generale

- **Status Bar (haut)** : Le `body::before` existant lira une variable CSS `--ios-top-color` au lieu d'un code couleur fixe. Layout.tsx mettra a jour cette variable selon la route.
- **Home Indicator (bas)** : Restaurer un `body::after` MAIS supprimer le `paddingBottom` inline de BottomNavigation pour eviter le doublon. Le `body::after` colorera la zone safe-area du bas. La BottomNavigation n'ajoutera plus de padding (elle est `fixed` et ne deborde plus).

### Regles de couleurs par page

| Page | Status Bar (haut) | Home Indicator (bas) |
|------|-------------------|----------------------|
| Accueil (carte) | `bg-card` avec motif sportif (comme le header) | `#1d283a` |
| Recherche `/search` | gris avec motif sportif | gris avec motif sportif |
| Telechargemnt / Loading | gris avec motif sportif | gris avec motif sportif |
| Conversation `/messages/*` | gris | gris |
| Tout le reste | `#1d283a` | `#1d283a` |

### Fichiers a modifier

#### 1. `src/index.css`
- Modifier `body::before` (status bar haut) pour lire `var(--ios-top-color, #1d283a)` au lieu du code fixe
- Ajouter `body::after` pour la zone home indicator du bas, lisant `var(--ios-bottom-color, #1d283a)`
- Le `body::after` est `position: fixed; bottom: 0; height: env(safe-area-inset-bottom); z-index: 9999`
- Pour les pages avec motif sportif : on ne peut pas mettre de background-image dans un pseudo-element facilement, donc on utilisera la couleur `hsl(var(--card))` qui correspond au fond de la barre header (meme ton gris/beige)

#### 2. `src/components/BottomNavigation.tsx`
- **Supprimer** le `style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}` du `<nav>` -- c'est lui qui cree le doublon car le `body::after` couvre deja cette zone
- La nav reste `fixed bottom-0` avec sa hauteur de 72px, le `body::after` est derriere/dessous en z-index mais couvre le home indicator

#### 3. `src/components/Layout.tsx`
- Mettre a jour le `useEffect` pour definir les DEUX variables CSS sur `document.documentElement` :
  - `--ios-top-color` : couleur de la status bar
  - `--ios-bottom-color` : couleur du home indicator
- Logique selon `location.pathname` :
  - `/` : top = `hsl(var(--card))` (meme couleur que le header map), bottom = `#1d283a`
  - `/messages` (liste) : top = `#1d283a`, bottom = `#1d283a`
  - `/messages/...` (conversation ouverte) : top = gris `hsl(var(--secondary))`, bottom = gris `hsl(var(--secondary))`
  - `/search` : top = `hsl(var(--card))`, bottom = `hsl(var(--card))`
  - Reste : top = `#1d283a`, bottom = `#1d283a`

#### 4. `src/pages/Search.tsx`
- Ajouter un `useEffect` qui met `--ios-top-color` et `--ios-bottom-color` a `hsl(var(--card))` (gris avec motif sportif = meme fond que le header)
- Nettoyage au demontage

#### 5. `src/components/LoadingScreen.tsx`
- Ajouter un `useEffect` similaire pour les couleurs loading (gris)

### Pourquoi ca resout le doublon

Le doublon venait du fait que BottomNavigation ajoutait `paddingBottom: safe-area-inset-bottom` (environ 34px sur iPhone), ce qui faisait deborder la nav vers le bas. Combine avec le fond `bg-background` de la nav, cela creait une bande supplementaire visible. En supprimant ce padding, la nav fait 72px pile et le `body::after` (en z-index 9999) colore la zone du home indicator independamment.

