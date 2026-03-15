

## Problème de zoom iOS vs Android

### Diagnostic
L'app apparaît légèrement zoomée sur iPhone 12 et légèrement dézoomée sur Android. Causes probables :

1. **Viewport meta** (ligne 6 de `index.html`) : `maximum-scale=1.0` est correct, mais il manque `minimum-scale=1.0` — certains navigateurs Android peuvent réduire l'échelle par défaut
2. **CSS `position: fixed` sur html/body** (ligne 122 de `index.css`) : combiné avec `100%` height au lieu de `100dvh`, peut causer des décalages sur iOS avec la barre d'adresse dynamique
3. **Pas de `-webkit-text-size-adjust`** : iOS Safari peut ajuster automatiquement la taille du texte, donnant l'impression d'un léger zoom

### Corrections

**`index.html`** — viewport meta plus strict :
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

**`src/index.css`** — normaliser le comportement cross-platform :
- Ajouter `-webkit-text-size-adjust: 100%` et `text-size-adjust: 100%` sur `html` pour empêcher iOS d'auto-ajuster les tailles de texte
- Ajouter `touch-action: pan-x pan-y` sur `html` pour éviter les zoom gestuels résiduels
- Utiliser `100dvh` au lieu de `100%` sur `html, body` pour cohérence avec `#root`

### Fichiers modifiés
- `index.html` — ajout `minimum-scale=1.0`
- `src/index.css` — ajout `text-size-adjust`, `touch-action`, normalisation hauteur

