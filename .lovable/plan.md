# Appliquer le code couleur iOS : Status Bar + Home Indicator

## Regles de couleur demandees

### Status Bar (haut)


| Page                                                                                       | Couleur                                             |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| Accueil (carte `/`)bleu avec motif sportif (meme couleur que la barre du haut avec cloche) | &nbsp;                                              |
| Chargement (LoadingScreen)page conversation > gris                                        | Gris avec motif sportif = `hsl(var(--card))`&nbsp; |
| Tout le reste                                                                              | `#1d283a`                                           |


### Home Indicator (bas)


| Page                        | Couleur                                      |
| --------------------------- | -------------------------------------------- |
| Chargement + Recherche      | Gris avec motif sportif = `hsl(var(--card))` |
| Conversations (`/messages`) | Gris = `hsl(var(--secondary))`               |
| Tout le reste               | `#1d283a`                                    |


## Modifications

### 1. `src/index.css` -- Rendre les pseudo-elements dynamiques

Actuellement `body::before` (status bar) est en dur `#1d283a`. Il faut le rendre dynamique via une variable CSS `--ios-top-color` :

```css
body::before {
  /* ... memes proprietes ... */
  background-color: var(--ios-top-color, #1d283a);
}
```

### 2. `src/components/Layout.tsx` -- Ajouter la logique pour les deux variables

Dans le `useEffect` existant, gerer les deux variables `--ios-top-color` et `--ios-bottom-color` :

- Route `/` (accueil) : top = `hsl(var(--card))`, bottom = `#1d283a`
- Route `/messages` : top = `#1d283a`, bottom = `hsl(var(--secondary))`
- Route `/search` : top = `#1d283a`, bottom = `hsl(var(--card))`
- Tout le reste : top = `#1d283a`, bottom = `#1d283a`

### 3. `src/pages/Search.tsx` -- Ajouter un useEffect pour les couleurs

Search est hors Layout. Ajouter un `useEffect` qui definit :

- `--ios-top-color` = `#1d283a`
- `--ios-bottom-color` = `hsl(var(--card))` (gris motif sportif)

### 4. `src/components/LoadingScreen.tsx` -- Ajouter un useEffect pour les couleurs

LoadingScreen est hors Layout. Ajouter un `useEffect` qui definit :

- `--ios-top-color` = `hsl(var(--card))` (gris motif sportif)
- `--ios-bottom-color` = `hsl(var(--card))` (gris motif sportif)

## Fichiers modifies


| Fichier                            | Changement                                                                         |
| ---------------------------------- | ---------------------------------------------------------------------------------- |
| `src/index.css`                    | `body::before` utilise `var(--ios-top-color, #1d283a)` au lieu de `#1d283a` en dur |
| `src/components/Layout.tsx`        | useEffect gere `--ios-top-color` + `--ios-bottom-color` selon la route             |
| `src/pages/Search.tsx`             | useEffect pour definir les deux variables CSS                                      |
| `src/components/LoadingScreen.tsx` | useEffect pour definir les deux variables CSS                                      |
