
# Barres systeme iOS en blanc pour le mode clair

Le fond natif iOS (Status Bar, Home Indicator, overscroll WKWebView) utilise actuellement un bleu fonce `#1d283a` (reste de l'ancien theme sombre). Puisque le mode clair est maintenant le mode par defaut, tout doit etre blanc/clair.

## Fichiers a modifier

### 1. `capacitor.config.ts`
- Ligne 16 : `backgroundColor: '#1d283a'` (StatusBar plugin) -> `'#F5F5F5'`
- Ligne 38 : `backgroundColor: '#1d283a'` (iOS config) -> `'#F5F5F5'`

### 2. `src/components/Layout.tsx`
- Lignes 33-34 : Les couleurs WKWebView hardcodees `#1d283a` -> `#F5F5F5`

### 3. `src/index.css`
- La regle `html, body` qui force `background-color: #F5F5F5` est deja correcte (mise a jour precedente)

### 4. `android/app/src/main/res/values/styles.xml`
- Les barres systeme Android sont en noir (`#000000`). On les passe en blanc pour correspondre au mode clair :
  - `android:statusBarColor` -> `#F5F5F5`
  - `android:navigationBarColor` -> `#F5F5F5`
  - `android:windowLightStatusBar` -> `true` (icones sombres sur fond clair)
  - `android:windowLightNavigationBar` -> `true`

### 5. `android/app/src/main/res/values/colors.xml`
- Ajouter une couleur `systemBarLight` (`#F5F5F5`)
- Remplacer les references `systemBarBlack` par `systemBarLight` dans les styles

### 6. `android/app/src/main/res/values-v35/styles.xml`
- Meme adaptation pour Android 15+

## Resultat attendu
- Status Bar : fond clair avec icones sombres (heure, batterie en noir)
- Home Indicator / Navigation Bar : fond clair
- Overscroll WKWebView : fond clair uniforme
- Coherence totale avec le theme clair de l'app
