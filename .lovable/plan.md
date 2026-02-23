

## Diagnostic

En regardant le screenshot, la zone de la status bar iOS (derrière "18:44") a une teinte légèrement grisée comparée au blanc pur de l'app en dessous. De même, la zone du Home Indicator en bas peut ne pas correspondre.

**Causes identifiées :**

1. **`body::before` (status bar)** utilise `var(--ios-top-color, hsl(var(--background)))` — une résolution CSS variable indirecte qui peut ne pas donner exactement `#FFFFFF` sur tous les moteurs WebKit. De plus, `Layout.tsx` set `--ios-top-color` à `'hsl(var(--card))'` (une string CSS avec variable imbriquée) ce qui peut causer des problèmes de résolution.

2. **Pas de `body::after`** pour la zone du Home Indicator en bas — il n'y a aucun pseudo-élément couvrant `safe-area-inset-bottom`, donc la couleur native du WKWebView transparaît.

3. **`--background: 0 0% 100%`** dans le CSS est bien blanc, mais la résolution `hsl(var(--card))` dans un `setProperty` JavaScript peut être ambiguë.

## Solution

### Fichier 1 : `src/index.css`

**Forcer `#FFFFFF` en dur** sur le `body::before` (status bar) et **ajouter un `body::after`** pour le Home Indicator :

```css
body::before {
  background-color: #FFFFFF;  /* Hardcodé au lieu de var(--ios-top-color) */
}

body::after {
  content: '';
  display: block;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: env(safe-area-inset-bottom, 0px);
  background-color: #FFFFFF;
  z-index: 9999;
  pointer-events: none;
}
```

### Fichier 2 : `src/components/Layout.tsx`

**Simplifier** : remplacer `hsl(var(--card))` par `#FFFFFF` directement dans le `setProperty`, et supprimer la logique conditionnelle inutile puisque toutes les pages utilisent du blanc :

```tsx
document.documentElement.style.setProperty('--ios-top-color', '#FFFFFF');
```

### Fichier 3 : `src/components/BottomNavigation.tsx`

**Ajouter `pb-[env(safe-area-inset-bottom)]`** sur la nav pour que le contenu ne soit pas caché par le pseudo-élément du Home Indicator (déjà géré par `ios-nav-padding` dans Layout, mais vérifier la cohérence).

### Résumé

- Status bar → `body::before` forcé en `#FFFFFF`
- Home Indicator → nouveau `body::after` en `#FFFFFF`
- Plus de résolution CSS variable imbriquée qui peut échouer sur WKWebView

