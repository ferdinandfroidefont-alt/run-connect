

## Problèmes identifiés

### 1. Double Home Indicator sur iOS
Le `body::after` dans `index.css` (lignes 385-396) crée un overlay blanc fixe en bas avec `z-index: 9999` qui couvre la zone `safe-area-inset-bottom`. **En plus**, le `BottomNavigation` a déjà son propre `paddingBottom: env(safe-area-inset-bottom)` (ligne 70), et la barre d'input Messages aussi (ligne 2234). Résultat : on voit **deux barres blanches empilées** dans la zone du Home Indicator.

### 2. Blanc différent entre WebView et app
Le `body::before` et `body::after` utilisent `#FFFFFF`, mais le fond natif WKWebView peut avoir un rendu légèrement différent à cause du compositing. Ces pseudo-éléments avec `z-index: 9999` créent une couche supplémentaire visible.

## Solution

**Supprimer `body::before` et `body::after`** dans le bloc `@supports (-webkit-touch-callout: none)` de `index.css`. Ces pseudo-éléments ne sont plus nécessaires car :
- Le `BottomNavigation` gère déjà le `safe-area-inset-bottom` via son padding inline
- Le `html, body` a déjà `background-color: #FFFFFF !important` (ligne 116)
- Le Status Bar est géré par Capacitor StatusBar plugin dans `main.tsx`

Les composants individuels (BottomNavigation, Messages input) gèrent correctement leurs propres safe areas — pas besoin d'une couche globale par-dessus.

## Fichier modifié

**`src/index.css`** — Supprimer les lignes 371-396 (le bloc `body::before` et `body::after` dans le `@supports (-webkit-touch-callout: none)`).

