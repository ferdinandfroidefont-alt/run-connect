

# Refonte Typographie, Formes et Style des Pages - Zwift Companion

## Analyse des captures Zwift Companion

Les captures montrent des choix typographiques et de forme tres specifiques :

- **Police** : Geometrique, type **Inter** ou **Plus Jakarta Sans** - plus moderne que DM Sans
- **Poids** : Titres en **font-black (900)** ou **extrabold (800)**, pas juste bold (700)
- **Boutons** : Forme **pill** (rounded-full) pour les CTA principaux, pas rounded-xl
- **Inputs** : Coins tres arrondis (rounded-2xl), fond gris clair, pas de bordure
- **Cards** : Coins 16px, ombres tres douces, espacement genereux (padding 20-24px)
- **Labels** : Tout en **UPPERCASE** avec letter-spacing large pour les sous-titres
- **Chiffres** : Police **tabular-nums**, taille 28-36px pour les stats

## Changements prevus

### 1. Police - Remplacer DM Sans par Inter (index.html + index.css + tailwind.config.ts)

Inter est plus proche de la typo Zwift : geometrique, propre, excellente lisibilite. On ajoute les poids 400-900.

### 2. Boutons - Forme pill et poids plus lourds (button.tsx)

- Variante `default` : `rounded-full` au lieu de `rounded-xl`, `font-bold` au lieu de `font-semibold`
- Variante `outline` : `rounded-full`, bordure plus epaisse
- Variante `tinted` : deja `rounded-full`, garder
- Tailles ajustees : default `h-[48px]`, sm `h-[36px]`, lg `h-[54px]`

### 3. Inputs (index.css ou composant Input)

- `rounded-2xl` (16px) au lieu de `rounded-[10px]`
- Fond `bg-muted/50` tres leger
- Pas de bordure visible (`border-0`)
- Hauteur 52px

### 4. Cards (card.tsx)

- `rounded-2xl` (16px) au lieu de `rounded-xl`
- Shadow encore plus subtile
- Padding interne augmente (p-5 au lieu de p-4)

### 5. Typographie globale (index.css)

- `.text-ios-largetitle` : passer a `font-black` (900)
- `.text-ios-title1/2/3` : passer a `font-extrabold` (800)
- Ajouter une classe `.text-stat` pour les grands chiffres (font-black, tabular-nums, 28px)
- Ajouter `.text-label` pour les labels uppercase (11px, uppercase, tracking-[0.1em], font-semibold, muted)

### 6. Page Auth (Auth.tsx)

- Logo dans un header orange gradient en haut (pas juste une image centree)
- Boutons "Continuer avec Google" en pill shape
- Inputs avec `rounded-2xl`
- Section header avec fond orange et texte blanc "RUNCONNECT"

### 7. Page Profil (Profile.tsx)

- Stats avec classe `.text-stat` (grands chiffres gras)
- Labels en `.text-label` (uppercase, tracking)
- Boutons d'action (Follow/Edit) en pill shape

### 8. Page Feed (FeedCard.tsx)

- Cards avec `rounded-2xl` et padding p-5
- Badge d'activite en pill

### 9. Navigation (BottomNavigation.tsx)

- Labels en font-bold au lieu de font-semibold
- Taille icones legerement augmentee (h-6.5)

## Details techniques

### Fichiers modifies

1. **index.html** - Remplacer Google Font DM Sans par Inter (poids 400-900)
2. **src/index.css** - Mettre a jour font-family, classes typographiques, ajouter `.text-stat` et `.text-label`
3. **tailwind.config.ts** - Remplacer DM Sans par Inter dans fontFamily.sans
4. **src/components/ui/button.tsx** - Forme pill (`rounded-full`), poids plus lourds
5. **src/components/ui/card.tsx** - `rounded-2xl`, shadow plus douce
6. **src/pages/Auth.tsx** - Header orange, inputs arrondis, boutons pill
7. **src/pages/Profile.tsx** - Stats avec `.text-stat`, labels uppercase
8. **src/components/feed/FeedCard.tsx** - Cards avec `rounded-2xl`
9. **src/components/BottomNavigation.tsx** - Labels bold

### Nouvelles classes CSS

```text
.text-stat     -> font-black text-[28px] tabular-nums leading-none
.text-label    -> text-[11px] uppercase tracking-[0.1em] font-semibold text-muted-foreground
```

### Police Inter

```text
Import: https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap
Font-family: 'Inter', ui-sans-serif, system-ui, sans-serif
```

## Ordre d'implementation

1. Police (index.html + tailwind.config + index.css)
2. Classes typographiques (index.css)
3. Composants UI (button, card)
4. Pages (Auth, Profile, Feed)
5. Navigation

