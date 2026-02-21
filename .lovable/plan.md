# Colorer dynamiquement la zone Home Indicator iOS par page

## Principe

Le systeme existant colore deja la zone status bar (haut) via `body::before` + la variable CSS `--ios-top-color`. On replique exactement ce pattern pour le bas avec `body::after` + `--ios-bottom-color`.

## Couleurs demandees


| Page                                                              | Couleur bas (Home Indicator) |
| ----------------------------------------------------------------- | ---------------------------- |
| Toutes les pages (defaut)                                         | `#1d283a`                    |
| Conversation ouverte (`/messages` avec conversation selectionnee) | `#465467`                    |
| Chargement (LoadingScreen)                                        | gris clair + pattern sportif |
| Recherche (`/search`)                                             | gris clair + pattern sportif |


## Modifications

### 1. `src/index.css` -- Ajouter `body::after`

Dans le bloc `@supports (-webkit-touch-callout: none)`, juste apres le `body::before` existant (ligne 453), ajouter un `body::after` identique mais pour le bas :

```css
body::after {
  content: '';
  display: block;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: env(safe-area-inset-bottom, 0px);
  background-color: var(--ios-bottom-color, #1d283a);
  background-image: var(--ios-bottom-pattern, none);
  background-size: 200px 200px;
  background-repeat: repeat;
  z-index: 9999;
  pointer-events: none;
}
```

La valeur par defaut est `#1d283a`, donc sans intervention JS, toutes les pages auront cette couleur.

### 2. `src/components/Layout.tsx` -- Piloter la couleur pour la conversation

Dans le `useEffect` existant (lignes 20-34), ajouter la logique pour `--ios-bottom-color`. La plupart des pages gardent le defaut (`#1d283a`), donc on ne set la variable que pour les cas speciaux. Cependant, comme la page Messages est dans Layout mais que la conversation est un etat interne du composant Messages, il faut un mecanisme pour que Messages puisse communiquer l'etat "conversation ouverte".

On utilisera un nouveau setter dans `AppContext` (ex: `setConversationOpen`) ou plus simplement, on fera la logique directement dans `Messages.tsx`.

### 3. `src/pages/Messages.tsx` -- Couleur conversation

Dans le `useEffect` qui gere deja `setHideBottomNav` quand `selectedConversation` change (lignes 206-212), ajouter :

- Quand conversation ouverte : `--ios-bottom-color` = `#465467`
- Quand liste conversations : supprimer la variable (retour au defaut `#1d283a`)

### 4. `src/components/LoadingScreen.tsx` -- Gris clair + pattern

Dans le `useEffect` existant (lignes 23-29), ajouter :

- `--ios-bottom-color` = la couleur gris clair du loading
- `--ios-bottom-pattern` = `url(/patterns/sports-pattern.png)`
- Nettoyage au unmount

### 5. `src/pages/Search.tsx` -- Gris clair + pattern

Dans le `useEffect` existant (lignes 49-55), ajouter :

- `--ios-bottom-color` = la couleur gris clair
- `--ios-bottom-pattern` = `url(/patterns/sports-pattern.png)`
- Nettoyage au unmount

## Resultat

- Par defaut `#1d283a` sur toutes les pages (couleur sombre de l'app)
- `#465467` quand une conversation est ouverte
- Gris clair avec motif sportif sur le chargement et la recherche
- Meme mecanisme eprouve que pour la status bar, aucune modification native requise

je ne veux pas que ça soit pour l barre home indicator mais pour le fond de la WKWEbView natif c'est compris ?