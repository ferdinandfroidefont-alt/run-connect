

# Refonte Design Complet - Style Zwift Companion Light

## Analyse des captures Zwift Companion

Les captures montrent un design tres distinct du design actuel :

- **Couleur primaire** : Orange vif (#FF6600) au lieu du bleu ciel actuel
- **Fond general** : Gris tres clair (#F2F2F7) quasi blanc
- **Cartes** : Blanc pur avec coins arrondis et ombres tres subtiles
- **Typographie** : Tres grasse (bold/black), majuscules pour les titres de section et labels
- **Navigation** : Fond blanc, icones noires inactives, orange actif, bouton central "+" orange rond
- **Separateurs** : Lignes fines gris clair sur toute la largeur
- **Stats** : Grands chiffres en gras avec petits labels uppercase en dessous
- **Dark cards** : Certaines sections (ex: tendances fitness) utilisent un fond gris fonce/ardoise

## Changements prevus

### 1. Tokens de couleur CSS (src/index.css)

Remplacer le systeme "Sky Blue" par un systeme "Zwift Orange" :

```text
Mode clair (:root) :
  --background:          0 0% 96%           (#F5F5F5 - gris tres clair)
  --foreground:          0 0% 13%           (#222222 - quasi noir)
  --card:                0 0% 100%          (#FFFFFF)
  --card-foreground:     0 0% 13%
  --primary:             24 100% 50%        (#FF6600 - orange Zwift)
  --primary-foreground:  0 0% 100%          (#FFFFFF)
  --secondary:           0 0% 93%           (#EDEDED)
  --secondary-foreground:0 0% 13%
  --muted:               0 0% 90%           (#E5E5E5)
  --muted-foreground:    0 0% 45%           (#737373)
  --border:              0 0% 90%           (#E5E5E5)
  --ring:                24 100% 50%

Mode sombre (.dark) :
  --background:          0 0% 7%            (#121212)
  --card:                0 0% 12%           (#1E1E1E)
  --primary:             24 100% 55%        (orange plus lumineux)
  --secondary:           0 0% 16%
  --muted:               0 0% 22%
  --border:              0 0% 20%
```

### 2. Navigation (BottomNavigation.tsx)

- Fond blanc opaque au lieu de blur transparent
- Icones noires (inactives) au lieu de gris
- Label actif en orange + texte uppercase plus petit
- Bouton central "+" : cercle orange plein (pas carre arrondi)
- Suppression du petit dot sous l'icone active
- Bordure superieure nette au lieu de subtle

### 3. Typographie globale

- Titres de sections : bold, taille plus grande, pas d'uppercase systematique mais style plus impose
- Labels de stats : uppercase, tracking-wide, petite taille
- Chiffres de stats : tres grands, font-black
- Police : garder DM Sans mais augmenter les poids (700/800)

### 4. Page Auth (Auth.tsx)

- Header orange avec logo blanc au lieu du fond secondaire
- Formulaires sur fond blanc avec coins arrondis
- Bouton principal orange plein
- Style Zwift : plus epure, moins de sous-sections empilees

### 5. Page Profil (Profile.tsx)

- Header avec photo grande a gauche, stats a droite (style Zwift capture 2)
- Section "SUIVIS / FOLLOWERS" en ligne horizontale avec separateur
- Stats en grille : grands chiffres gras + labels uppercase
- Barre de progression style Zwift pour le niveau
- Bouton "ACTIVITES" orange en bas du profil

### 6. Page Feed (Feed.tsx)

- Cards d'activite avec image a gauche, texte a droite
- Bouton like bleu cyan (style Zwift thumb-up)
- Stats en ligne : km, temps, denivele en gras
- Separateurs pleine largeur entre les cards

### 7. Composant Button (button.tsx)

- Variante default : orange plein, coins plus arrondis (12px)
- Active state : assombrissement au lieu d'opacity
- Taille default legerement plus compacte

### 8. Composant Card (card.tsx)

- Ombre encore plus subtile
- Border-radius 12px
- Pas de bordure visible par defaut

### 9. Composant IOSListItem (ios-list-item.tsx)

- Icones de couleur (bleu cyan, orange) au lieu du bg-primary generique
- Texte plus gras pour les titres de menu
- Separateurs sur toute la largeur (pas inset)

### 10. LoadingScreen

- Adapter les couleurs du loading screen a l'orange

## Fichiers modifies

1. `src/index.css` - Tokens CSS complets light + dark
2. `src/components/BottomNavigation.tsx` - Redesign navigation
3. `src/components/ui/button.tsx` - Variantes de bouton
4. `src/components/ui/card.tsx` - Style des cartes
5. `src/components/ui/ios-list-item.tsx` - Style des listes
6. `src/pages/Auth.tsx` - Page de connexion
7. `src/pages/Profile.tsx` - Page profil (header + stats)
8. `src/pages/Feed.tsx` - Feed d'activites
9. `src/components/feed/FeedHeader.tsx` - Header du feed
10. `tailwind.config.ts` - Keyframes glow adaptes
11. `android/app/src/main/res/values/colors.xml` - Couleurs Android
12. `android-webview/app/src/main/res/values/colors.xml` - Couleurs Android WebView
13. `android/app/src/main/res/drawable/splash_gradient.xml` - Splash screen

## Ordre d'implementation

1. Tokens CSS (fondation - tout le reste en depend)
2. Composants UI de base (Button, Card, ListItem)
3. Navigation
4. Pages (Auth, Feed, Profile)
5. Ressources Android

