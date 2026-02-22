

# Fix definitif : fond WKWebView natif par style inline direct

## Diagnostic du probleme

Le code actuel fait :
```js
document.documentElement.style.setProperty('--wkwebview-bg', '#465467');
```
Puis le CSS fait :
```css
html, body { background-color: var(--wkwebview-bg, #1d283a) !important; }
```

Le probleme : la WKWebView native lit la couleur **computee** de `html`/`body`. Mais :
1. La resolution de `var(--wkwebview-bg)` passe par une indirection (variable CSS) qui n'est pas toujours resolue a temps par le moteur natif
2. La regle est dans `@layer base` qui a une priorite de cascade basse
3. `@apply bg-background` sur `body` (ligne 149) genere un `background-color` concurrent

## Solution : style inline direct

Au lieu de passer par une variable CSS, on ecrit **directement** la couleur en inline style :
```js
document.documentElement.style.backgroundColor = '#465467';
document.body.style.backgroundColor = '#465467';
```

Un inline style est **toujours** prioritaire sur toute regle CSS (meme `!important` dans `@layer`). La WKWebView voit immediatement la couleur computee.

## Modifications

### 1. `src/index.css` (ligne 167) -- Garder le fallback

Conserver la regle existante comme fallback initial (avant que le JS ne s'execute) :
```css
html, body {
  background-color: #1d283a !important;
  /* ... reste inchange */
}
```
Remplacer `var(--wkwebview-bg, #1d283a)` par juste `#1d283a` en dur. La variable CSS n'est plus necessaire puisque le JS pilotera directement.

### 2. `src/components/Layout.tsx` -- Inline style direct

Remplacer :
```js
document.documentElement.style.setProperty('--wkwebview-bg', '#1d283a');
```
Par :
```js
document.documentElement.style.backgroundColor = '#1d283a';
document.body.style.backgroundColor = '#1d283a';
```
Et au cleanup, retirer ces inline styles.

### 3. `src/components/LoadingScreen.tsx` -- Inline style direct

Remplacer :
```js
document.documentElement.style.setProperty('--wkwebview-bg', '#465467');
```
Par :
```js
document.documentElement.style.backgroundColor = '#465467';
document.body.style.backgroundColor = '#465467';
```
Cleanup au unmount :
```js
document.documentElement.style.removeProperty('background-color');
document.body.style.removeProperty('background-color');
```

### 4. `src/pages/Search.tsx` -- Inline style direct

Meme remplacement :
```js
document.documentElement.style.backgroundColor = '#465467';
document.body.style.backgroundColor = '#465467';
```
Cleanup au unmount.

### 5. `src/pages/Messages.tsx` (lignes 209-215) -- Inline style direct

Remplacer :
```js
document.documentElement.style.setProperty('--wkwebview-bg', '#465467');
// et
document.documentElement.style.setProperty('--wkwebview-bg', '#1d283a');
```
Par :
```js
document.documentElement.style.backgroundColor = '#465467';
document.body.style.backgroundColor = '#465467';
// et
document.documentElement.style.backgroundColor = '#1d283a';
document.body.style.backgroundColor = '#1d283a';
```

## Recapitulatif des couleurs

| Page | Couleur inline |
|------|---------------|
| Defaut (toutes pages) | `#1d283a` |
| Chargement | `#465467` |
| Recherche | `#465467` |
| Conversation ouverte | `#465467` |

## Pourquoi ca marchera cette fois

1. **Inline style** = priorite maximale dans la cascade CSS, aucune regle ne peut l'overrider
2. **Valeur hex directe** = pas d'indirection par variable CSS, la couleur computee est immediate
3. **Double application** (html + body) = la WKWebView lit la couleur du premier element qui la definit
4. **Fallback CSS en dur** (#1d283a sans variable) = avant meme que le JS s'execute, la bonne couleur par defaut est la

