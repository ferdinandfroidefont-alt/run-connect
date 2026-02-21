

# Fix: le fond WKWebView ne change pas de couleur

## Probleme identifie

Le fond natif de la WKWebView iOS ne resout **pas** les variables CSS imbriquees comme `hsl(var(--secondary))`. La couche native lit la couleur computee de `html`/`body`, mais les references de type `hsl(var(...))` ne sont pas toujours resolues correctement par le moteur natif.

De plus, la regle a la **ligne 167** (`background-color: hsl(var(--background))`) dans `@layer base` entre potentiellement en conflit meme si le `!important` de la ligne 457 devrait gagner.

## Solution

Remplacer toutes les references `hsl(var(--secondary))` par des **couleurs hexadecimales en dur** dans les appels a `--wkwebview-bg`. Le natif iOS comprend uniquement les couleurs resolues.

## Modifications

### 1. `src/components/LoadingScreen.tsx`

Remplacer :
```js
document.documentElement.style.setProperty('--wkwebview-bg', 'hsl(var(--secondary))');
```
Par la couleur hex equivalente du mode sombre (puisque le defaut de l'app est sombre) :
```js
document.documentElement.style.setProperty('--wkwebview-bg', '#3b4a5c');
```

Note : `--secondary` en mode sombre = `215 19% 34%` = environ `#465467`. En mode clair = `215 19% 34%` aussi. La valeur exacte sera calculee et codee en dur.

### 2. `src/pages/Search.tsx`

Meme correction :
```js
document.documentElement.style.setProperty('--wkwebview-bg', 'hsl(var(--secondary))');
```
Remplacer par la meme couleur hex en dur.

### 3. `src/index.css` -- Renforcer la regle

Deplacer la regle `html, body { background-color: var(--wkwebview-bg, #1d283a) !important; }` **en dehors** du bloc `@supports (-webkit-touch-callout: none)` pour qu'elle s'applique aussi dans le preview web, et la mettre **apres** la regle de la ligne 167 pour garantir la cascade.

Ou bien : ajouter `!important` aussi a la ligne 167, mais avec la variable `--wkwebview-bg`.

Concretement, remplacer la ligne 167 :
```css
background-color: hsl(var(--background));
```
Par :
```css
background-color: var(--wkwebview-bg, #1d283a) !important;
```

Et supprimer le doublon dans le bloc `@supports` (lignes 455-458).

### 4. Valeurs hex exactes a utiliser

| Variable CSS | Valeur HSL | Hex calcule |
|---|---|---|
| `--secondary` dark (215 19% 34%) | `hsl(215, 19%, 34%)` | `#465467` |
| `--secondary` light (215 19% 34%) | `hsl(215, 19%, 34%)` | `#465467` |
| Defaut | - | `#1d283a` |
| Conversation | - | `#465467` |

## Fichiers modifies

- `src/index.css` : unifier la regle background sur `html, body`
- `src/components/LoadingScreen.tsx` : hex en dur au lieu de `hsl(var(...))`
- `src/pages/Search.tsx` : hex en dur au lieu de `hsl(var(...))`

## Resultat attendu

Le fond natif WKWebView changera effectivement de couleur car seules des valeurs hex resolues seront utilisees, sans dependance aux variables CSS imbriquees.
