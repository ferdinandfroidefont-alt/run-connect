

# Correction iOS : Status Bar + Home Indicator (sans doublon)

## Les 3 bugs identifies

1. **Home Indicator double** : `body::after` ajoute une bande en bas ET `BottomNavigation` ajoute aussi `paddingBottom: env(safe-area-inset-bottom)` = deux fois l'espace.
2. **Couleurs jamais appliquees** : `--ios-bottom-color` est definie sur un `<div>` enfant dans Layout.tsx, mais `body::after` lit depuis `body` qui ne connait pas cette variable (utilise toujours le fallback).
3. **Status Bar invisible** : `StatusBar.setBackgroundColor()` est une methode Android-only dans Capacitor. Sur iOS, la status bar est transparente et prend la couleur du contenu web derriere elle.

## Corrections

### 1. `src/index.css` -- Supprimer le `body::after` doublon
Supprimer le pseudo-element `body::after` (lignes 441-453) qui cree la bande en bas. C'est lui qui double le home indicator. La couleur du bas sera geree uniquement par le `paddingBottom` de la BottomNavigation + le fond de la nav.

### 2. `src/components/BottomNavigation.tsx` -- Couleur de fond correcte
La nav a deja `paddingBottom: env(safe-area-inset-bottom)`. Il faut juste s'assurer que son `background-color` couvre proprement la zone safe-area (pas de transparence dans cette zone). Remplacer `bg-background/80` par un fond opaque pour la zone du padding bottom, en ajoutant un `::after` ou en utilisant un gradient/fond solide derriere la safe area.

### 3. `src/components/Layout.tsx` -- Couleur dynamique via style sur document.body
Au lieu de mettre `--ios-bottom-color` sur un div enfant, utiliser un `useEffect` qui applique directement `document.documentElement.style.setProperty('--ios-bottom-color', couleur)` quand la route change. Ainsi la variable CSS est lisible par tout le document.

### 4. `src/main.tsx` -- Corriger l'init StatusBar iOS
Supprimer l'appel `StatusBar.setBackgroundColor()` qui n'existe pas sur iOS. Garder uniquement :
- `StatusBar.setStyle({ style: Style.Light })` (texte blanc)
- `StatusBar.show()` (toujours visible)
- `StatusBar.setOverlaysWebView({ overlay: false })` pour que le contenu web ne passe pas derriere la status bar

### 5. `src/index.css` -- Ajouter un fond pour la zone status bar
Ajouter une regle CSS qui colore le fond derriere la status bar en `#1d283a` via un `body::before` fixe en haut avec `height: env(safe-area-inset-top)`, ou via un fond sur le `html`/`body` qui sera visible dans la zone safe-area du haut.

## Strategie pour la couleur dynamique du bas

Au lieu du `body::after` supprime, la couleur dynamique du home indicator sera geree par :
- La BottomNavigation elle-meme (fond opaque qui couvre sa zone de padding-bottom)
- Pour les pages sans BottomNavigation : un `useEffect` dans Layout qui met la couleur sur `document.documentElement`

## Resume des fichiers modifies

| Fichier | Action |
|---------|--------|
| `src/index.css` | Supprimer `body::after` (doublon), ajouter fond haut pour status bar |
| `src/components/BottomNavigation.tsx` | Fond opaque sur la zone safe-area du bas |
| `src/components/Layout.tsx` | `useEffect` pour `--ios-bottom-color` sur `documentElement` |
| `src/main.tsx` | Corriger appels StatusBar iOS (supprimer `setBackgroundColor`) |
| `src/pages/Search.tsx` | Retirer le style inline `--ios-bottom-color` (inutile maintenant) |
| `src/components/LoadingScreen.tsx` | Retirer le style inline `--ios-bottom-color` (inutile maintenant) |

