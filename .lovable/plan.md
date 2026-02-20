
# Configuration iOS : Status Bar visible + Home Indicator dynamique

## Objectif
1. Status Bar toujours visible des le premier rendu avec fond `#1d283a` et texte clair
2. Home Indicator (zone du bas) avec couleur dynamique selon la page
3. Aucun flash blanc, aucun masquage intempestif

## Analyse du probleme actuel

La Status Bar disparait au premier lancement car :
- Le plugin `@capacitor/status-bar` n'est **pas installe ni utilise** dans le projet
- `capacitor.config.ts` a `ios.backgroundColor: '#465268'` (mauvaise couleur, et insuffisant)
- Aucun appel a `StatusBar.show()` ou `StatusBar.setStyle()` n'existe

## Modifications

### 1. Installer `@capacitor/status-bar`
Ajouter la dependance npm `@capacitor/status-bar` au projet.

### 2. `capacitor.config.ts`
```text
ios: {
  contentInset: 'always',
  backgroundColor: '#1d283a',   // <-- couleur corrigee
  ...reste inchange
},
plugins: {
  StatusBar: {
    style: 'LIGHT',             // texte/icones blancs
    backgroundColor: '#1d283a'
  },
  ...existants
}
```
- `contentInset: 'always'` : la WebView ne recouvre PAS la status bar (equivalent de `setOverlaysWebView(false)`)
- `backgroundColor: '#1d283a'` : fond de la zone systeme iOS

### 3. `src/main.tsx` -- Initialiser StatusBar au demarrage
Dans `initializeCapacitorPlugins()`, ajouter apres le chargement des plugins :
```text
if (detectedPlatform === 'ios') {
  const { StatusBar, Style } = await import('@capacitor/status-bar');
  await StatusBar.setStyle({ style: Style.Light });
  await StatusBar.setBackgroundColor({ color: '#1d283a' });
  await StatusBar.show();
}
```
Cela garantit que la Status Bar est visible des le premier rendu, avec le bon style.

### 4. `src/index.css` -- Restaurer `safe-area-inset-bottom` pour la zone Home Indicator
Dans le bloc `@supports (-webkit-touch-callout: none)`, ajouter une regle pour que le body ait un padding-bottom qui couvre la zone home indicator :
```text
body::after {
  content: '';
  display: block;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: env(safe-area-inset-bottom, 0px);
  background-color: hsl(var(--ios-bottom-color, 218 38% 17%));
  z-index: 9999;
  pointer-events: none;
}
```
Et definir la variable CSS `--ios-bottom-color` en valeur par defaut a `#1d283a` (= `218 38% 17%` en HSL).

### 5. `src/components/BottomNavigation.tsx` -- Restaurer le padding bottom + couleur
Remettre `paddingBottom: 'env(safe-area-inset-bottom, 0px)'` sur le `<nav>` pour que la tab bar couvre proprement la zone home indicator, et s'assurer que le fond de la nav correspond a la page.

### 6. `src/components/Layout.tsx` -- Variable CSS dynamique par page
Ajouter une logique qui change `--ios-bottom-color` sur le `<div>` racine du Layout selon le `pathname` :

| Route | Couleur fond bas |
|-------|-----------------|
| `/` (carte) | `#1d283a` |
| `/search` | gris secondaire (inchange, `bg-secondary`) |
| `/messages` | gris actuel (inchange) |
| Ecran de chargement | gris motifs (inchange) |
| Tout le reste | `#1d283a` |

Implementation : lire `useLocation().pathname` et appliquer un style inline `--ios-bottom-color` sur le wrapper.

### 7. `src/pages/Search.tsx` -- Couleur bas dynamique
Le composant Search est hors Layout (pas de `<Layout>`). Ajouter la meme variable CSS `--ios-bottom-color` pointant vers la couleur secondaire grise du theme.

### 8. `src/components/LoadingScreen.tsx` -- Couleur bas dynamique
Ecran de chargement : appliquer `--ios-bottom-color` avec la couleur secondaire grise (meme que `bg-secondary`).

## Fichiers Android
Aucune modification. Les styles Android restent inchanges avec leurs barres noires actuelles.

## Resultat attendu
- Status Bar visible immediatement au lancement avec fond `#1d283a` et texte blanc
- Home Indicator zone coloree dynamiquement : bleu fonce `#1d283a` sur carte et pages standard, gris sur recherche/chargement/conversations
- Zero flash blanc
- Android inchange
