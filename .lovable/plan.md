

## Diagnostic

### 1. Home indicator (barre du bas iOS)
Deux endroits ajoutent du padding pour le home indicator via `env(safe-area-inset-bottom)` :
- **`BottomNavigation.tsx` ligne 70** : `style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}`
- **`Messages.tsx` ligne 2234** : `style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}`

### 2. Blanc different entre l'app et le WKWebView/StatusBar
Le probleme : dans `capacitor.config.ts`, le `backgroundColor` est defini a **`#F5F5F5`** (gris clair) pour iOS et la StatusBar, alors que l'app React utilise **`#FFFFFF`** (blanc pur) partout (`index.css`, `Layout.tsx`). Ca cree une difference de teinte visible autour du contenu web.

## Modifications

### Fichier 1 : `src/components/BottomNavigation.tsx`
- **Ligne 70** : Supprimer `style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}` de la nav

### Fichier 2 : `src/pages/Messages.tsx`
- **Ligne 2234** : Supprimer `style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}` de la zone input

### Fichier 3 : `capacitor.config.ts`
- **StatusBar backgroundColor** : changer `#F5F5F5` → `#FFFFFF`
- **iOS backgroundColor** : changer `#F5F5F5` → `#FFFFFF`

Ca aligne tout sur le meme blanc pur `#FFFFFF` : app React, fond WKWebView, et status bar iOS.

