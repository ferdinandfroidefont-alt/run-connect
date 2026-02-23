

## Corriger la barre blanche apres envoi de photo via le raccourci camera

### Le probleme

Quand tu utilises le bouton camera a cote de l'heure dans la liste des conversations, la prise de photo ouvre la camera native. Au retour, une barre blanche apparait en haut de l'application et reste presente partout.

### Cause identifiee

Deux problemes dans `src/hooks/useCamera.tsx` :

1. **`takePicture()` (lignes 88-112)** : L'element `<input type="file">` cree par `document.createElement('input')` n'est jamais retire du DOM. Sur iOS/Android WebView, quand la camera native se ferme et l'app revient au premier plan, cet input "fantome" peut perturber le layout.

2. **`selectFromGalleryWeb()` (lignes 234-361)** : L'input est ajoute au DOM avec `position: fixed; top: 0` et `opacity: 0.01`. Il n'est retire qu'apres un delai de 200ms, et uniquement si la resolution se fait normalement. En cas de timeout ou d'erreur, il peut rester dans le DOM indefiniment, creant une barre visible en haut.

De plus, dans `src/components/Layout.tsx`, l'effet qui definit `--ios-top-color` et le `backgroundColor` du body a un cleanup qui supprime ces styles. Si le retour de camera provoque un re-render, le `body::before` (pseudo-element CSS pour la zone de status bar iOS) peut se retrouver avec un fond blanc visible.

### Corrections prevues

#### 1. Fichier : `src/hooks/useCamera.tsx`

- **`takePicture()`** : Ajouter l'input au DOM avant de cliquer (necessaire pour certains WebViews), puis le retirer systematiquement dans un bloc `finally` ou apres resolution.
- **`selectFromGalleryWeb()`** : Garantir le nettoyage de l'input dans **tous** les chemins de resolution (timeout, erreur, annulation). Ajouter un nettoyage des inputs residuels au debut de `takePicture()` aussi.
- Ajouter un attribut `data-camera-picker` sur les inputs de `takePicture()` pour pouvoir les identifier et les nettoyer.

#### 2. Fichier : `src/components/Layout.tsx`

- Supprimer le cleanup qui retire `backgroundColor` et `--ios-top-color` dans le `return` du `useEffect`. Ces styles doivent rester permanents car leur suppression cree un flash blanc quand le composant se remonte apres le retour de camera.
- Garder uniquement la logique de re-set des styles sur chaque changement de `location.pathname`, sans les retirer au demontage.

### Resultat attendu

- Plus aucun element `<input>` residuel dans le DOM apres la prise de photo
- Le fond de la status bar iOS reste stable, sans barre blanche
- Le raccourci camera continue de fonctionner normalement

