

# Supprimer la barre de statut iOS

## Probleme
La barre de statut (heure, batterie, reseau) reste visible en haut de l'ecran sur iPhone. Elle n'a jamais ete masquee car le plugin necessaire n'est pas installe.

## Solution

### 1. Installer le plugin Capacitor StatusBar
Ajouter `@capacitor/status-bar` au projet. C'est le seul moyen officiel de cacher la barre de statut sur iOS dans une app Capacitor.

### 2. Masquer la barre de statut au demarrage de l'app
Dans `src/main.tsx` (ou `src/lib/capacitor-init.ts`), appeler `StatusBar.hide()` au lancement :

```typescript
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  StatusBar.hide();
}
```

### 3. Mettre a jour la config Capacitor (iOS)
Dans `capacitor.config.ts`, ajouter la config du plugin StatusBar :

```typescript
plugins: {
  StatusBar: {
    style: 'Dark',
    backgroundColor: '#0F1729'
  }
}
```

### 4. Ajouter la meta tag pour le web (PWA/Safari)
Dans `index.html`, ajouter :
```html
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-capable" content="yes" />
```
Cela masque visuellement la barre de statut quand l'app est ajoutee a l'ecran d'accueil depuis Safari.

## Details techniques
- Le plugin `@capacitor/status-bar` est la methode officielle Capacitor pour controler la barre de statut iOS/Android
- `StatusBar.hide()` utilise l'API native `prefersStatusBarHidden` sur iOS
- Les meta tags couvrent le cas PWA (app installee depuis Safari)
- L'appel est protege par `Capacitor.isNativePlatform()` pour ne pas planter sur le web

## Fichiers modifies
- `package.json` (ajout dependance)
- `src/main.tsx` ou `src/lib/capacitor-init.ts` (appel StatusBar.hide)
- `capacitor.config.ts` (config plugin)
- `index.html` (meta tags PWA)

