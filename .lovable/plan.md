

## Harmoniser la couleur des barres iOS avec le blanc de l'app

### Le probleme

Sur iPhone, la barre de statut (en haut) et la zone du Home Indicator (en bas) ont une couleur gris clair `#F5F5F5`, alors que l'application utilise du blanc pur `#FFFFFF` pour les cards et le fond. Cela cree une difference de teinte visible entre les barres systeme et le contenu de l'app.

### Cause

Plusieurs fichiers codent en dur la couleur `#F5F5F5` pour le fond du body/html et les barres systeme iOS, au lieu d'utiliser `#FFFFFF` qui correspond au blanc reel de l'app.

### Corrections

#### 1. `src/components/Layout.tsx`
- Ligne 33-34 : Remplacer `#F5F5F5` par `#FFFFFF` pour le backgroundColor du body et html

#### 2. `src/components/LoadingScreen.tsx`
- Ligne 25-27 : Remplacer `#F5F5F5` par `#FFFFFF` pour `--ios-top-color` et les backgrounds

#### 3. `src/pages/Search.tsx`
- Ligne 51-53 : Remplacer `#F5F5F5` par `#FFFFFF`

#### 4. `src/index.css`
- Ligne ~162 : Remplacer `background-color: #F5F5F5 !important` du html/body par `#FFFFFF !important`

#### 5. Fichiers Android (pour coherence)
- `android/app/src/main/res/values/colors.xml` : Changer `systemBarLight` de `#F5F5F5` a `#FFFFFF`
- `android-webview/app/src/main/res/values/colors.xml` : Idem

### Resultat attendu

Les barres iOS en haut et en bas seront exactement du meme blanc que le contenu de l'app, sans difference de teinte visible.

