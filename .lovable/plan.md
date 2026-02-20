

# Nouveau Design System "Sky Blue" inspire de la reference

## Analyse de l'image de reference

L'image montre un design tres lumineux et aerien avec :
- **Fond general** : gris-bleu tres clair (~#E8EEF5)
- **Cartes** : blanc pur avec ombres douces et coins tres arrondis
- **Couleur primaire** : bleu ciel doux (~#4DA6E8 / HSL 207 78% 60%)
- **Accents** : vert pour les progres, jaune/orange pour les badges
- **Boutons principaux** : bleu ciel plein avec texte blanc
- **Typographie** : noire sur fond clair, propre et aeree
- **Coins arrondis** : tres genereux (16px+)

## Changements prevus

### 1. Tokens de couleur (src/index.css)

**Mode clair (:root)** :
- `--background` : passer de gris actuel a un bleu-gris tres pale (~210 30% 95%)
- `--card` : blanc pur (0 0% 100%)
- `--primary` : bleu ciel (#4DA6E8 -> HSL 207 78% 60%) au lieu du bleu-gris fonce actuel
- `--primary-foreground` : blanc pur
- `--secondary` : bleu pale (#D6E8F7 -> HSL 210 55% 90%)
- `--muted` : gris-bleu clair
- `--border` : bordures plus douces, bleu-gris clair
- `--radius` : passer de 0rem a 1rem (16px) pour des coins plus arrondis
- Ombres plus douces et diffuses

**Mode sombre (.dark)** :
- Adapter les tokens pour garder la coherence avec le nouveau bleu ciel comme primaire
- `--primary` : version plus lumineuse du bleu ciel pour le mode sombre
- Garder le fond sombre actuel en le teintant legerement en bleu

### 2. Fichiers Android

**android/app/src/main/res/values/colors.xml** et **android-webview/.../colors.xml** :
- `colorPrimary` : passer de #5B7CFF a #4DA6E8
- `colorPrimaryDark` : ajuster a #3A8FCC
- `colorAccent` : garder ou ajuster

**android/.../splash_gradient.xml** :
- Mettre a jour les couleurs du gradient vers les nouveaux tons bleu ciel

### 3. Tailwind config (tailwind.config.ts)

- Le fichier reference deja les CSS variables, donc les changements dans index.css se propagent automatiquement
- Mettre a jour le keyframe `glow-pulse` pour utiliser le nouveau HSL primaire

### 4. Theme Context (src/contexts/ThemeContext.tsx)

- Aucun changement necessaire, il gere deja le toggle light/dark

## Details techniques des nouvelles valeurs HSL

```text
Mode clair:
  --background:          210 30% 95%     (#E8EEF5)
  --foreground:          220 30% 15%     (gris tres fonce)
  --card:                0 0% 100%       (#FFFFFF)
  --card-foreground:     220 30% 15%
  --primary:             207 78% 60%     (#4DA6E8)
  --primary-foreground:  0 0% 100%       (#FFFFFF)
  --secondary:           210 40% 92%     (#DDE8F3)
  --secondary-foreground:220 30% 15%
  --muted:               210 25% 90%     (#E0E7EF)
  --muted-foreground:    215 15% 50%
  --accent:              210 40% 96%     (inchange)
  --accent-foreground:   215 16% 46%
  --border:              210 25% 88%
  --input:               210 25% 88%
  --ring:                207 78% 60%
  --radius:              1rem

Mode sombre:
  --primary:             207 80% 65%     (bleu ciel plus lumineux)
  --primary-foreground:  220 40% 8%
  (reste adapte en coherence)

Android:
  colorPrimary:  #4DA6E8
  colorPrimaryDark: #3A8FCC
```

## Fichiers modifies

1. `src/index.css` - Tokens CSS light + dark
2. `tailwind.config.ts` - Keyframe glow-pulse HSL
3. `android/app/src/main/res/values/colors.xml` - Couleurs Android
4. `android-webview/app/src/main/res/values/colors.xml` - Couleurs Android WebView
5. `android/app/src/main/res/drawable/splash_gradient.xml` - Gradient splash

