

## Remplacement de l'icone de l'application

L'image uploadee sera utilisee comme nouvelle icone partout dans l'application.

### Changements prevus

**1. Copier l'image dans le projet**
- Copier l'image vers `src/assets/app-icon.png` (remplace l'ancienne, utilisee dans Auth, About, LoadingScreen)
- Copier l'image vers `public/favicon.png` (remplace le favicon web)

**2. Fichiers impactes automatiquement (aucune modification de code necessaire)**
Les fichiers suivants importent deja `@/assets/app-icon.png`, donc ils utiliseront automatiquement la nouvelle icone :
- `src/pages/Auth.tsx` - page de connexion
- `src/pages/About.tsx` - page a propos
- `src/components/LoadingScreen.tsx` - ecran de chargement

Le `index.html` reference deja `/favicon.png`, donc le favicon sera aussi mis a jour automatiquement.

**3. Instructions pour iOS (manuel, hors Lovable)**
Pour que l'icone apparaisse sur iOS (App Store / SpringBoard), il faudra :
- Ouvrir le projet Xcode (`ios/App/App.xcworkspace`)
- Aller dans `Assets.xcassets > AppIcon`
- Remplacer toutes les tailles d'icone avec la nouvelle image (1024x1024 pour l'App Store, puis les tailles reduites : 180x180, 120x120, 87x87, 80x80, 60x60, 58x58, 40x40, 29x29, 20x20)
- Des outils comme [appicon.co](https://appicon.co) permettent de generer toutes les tailles automatiquement a partir d'une seule image

### Details techniques

- L'image source est `user-uploads://4A14AEA8-0C35-49D9-B1BF-A09ADD1BA78B.png`
- Elle sera copiee en tant que `src/assets/app-icon.png` et `public/favicon.png`
- Pour Android, les icones launcher (`mipmap-*`) dans `android/app/src/main/res/` devront aussi etre remplacees manuellement dans Android Studio (hors perimetre Lovable)

