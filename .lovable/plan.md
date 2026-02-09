

# Refonte Style iOS - Boutons, Badges et Etiquettes

## Objectif
Transformer les boutons, badges et etiquettes de l'app vers un style iOS plus riche et vibrant, inspire de l'image fournie : boutons pilule avec degrades subtils, etiquettes colorees avec icones, et badges aux teintes douces.

## Changements prevus

### 1. Bouton principal (`src/components/ui/button.tsx`)
- Ajouter un leger degrade sur le variant `default` (bleu iOS plus vivant)
- Ajouter un nouveau variant `tinted` : fond teinte leger (ex: `bg-primary/10 text-primary`) pour les boutons d'action secondaires style iOS
- Affiner les coins arrondis pour un aspect plus pilule (`rounded-full`) sur le variant `sm`
- Ajouter une ombre coloree subtile sur le bouton principal (`shadow-sm shadow-primary/20`)

### 2. Badges et etiquettes (`src/components/ui/badge.tsx`)
- Ajouter un variant `tinted` avec fond teinte transparent et texte colore (style chips iOS)
- Ajouter des variants colores : `success` (vert), `warning` (orange), `info` (bleu) avec leurs teintes respectives
- Augmenter legerement le padding et la taille de texte pour un aspect plus genereux

### 3. Boutons d'action du Feed (`src/components/feed/FeedActions.tsx`)
- Remplacer le fond transparent des boutons like/comment/share par des fonds teintes subtils
- Donner au bouton "Rejoindre" un degrade bleu plus iOS avec ombre portee coloree

### 4. Filtres et chips (`src/components/feed/DiscoverFilters.tsx`)
- Passer les chips d'activite a un style plus genereux : padding plus large, fond teinte colore, coins full-round
- Etat actif avec fond colore plein et ombre douce

### 5. Filtres de session (`src/components/SessionFilters.tsx`)
- Meme traitement que DiscoverFilters : chips arrondis, teintes colorees, transitions douces

### 6. Variables CSS (`src/index.css`)
- Ajouter des utilitaires pour les fonds teintes iOS : `.ios-tinted-blue`, `.ios-tinted-green`, `.ios-tinted-red`, etc.
- Ajouter un style de bouton degrade `.ios-gradient-btn`

## Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `src/components/ui/button.tsx` | Nouveau variant `tinted`, ombre coloree sur `default`, `rounded-full` sur `sm` |
| `src/components/ui/badge.tsx` | Variants `tinted`, `success`, `warning`, `info` avec fonds teintes |
| `src/components/feed/FeedActions.tsx` | Boutons avec fonds teintes, "Rejoindre" avec degrade et ombre |
| `src/components/feed/DiscoverFilters.tsx` | Chips plus genereux, fonds teintes colores |
| `src/components/SessionFilters.tsx` | Chips activite avec style iOS teinte |
| `src/index.css` | Utilitaires CSS pour teintes et degrades iOS |

## Details techniques

**button.tsx** - Ajouts :
- Variant `default` : ajout `shadow-sm shadow-primary/25` pour l'ombre coloree
- Nouveau variant `tinted` : `bg-primary/10 text-primary font-semibold rounded-full active:bg-primary/20`
- Size `sm` passe a `rounded-full` au lieu de `rounded-[10px]`

**badge.tsx** - Ajouts de variants :
- `tinted` : `border-transparent bg-primary/12 text-primary`
- `success` : `border-transparent bg-green-500/12 text-green-600`
- `warning` : `border-transparent bg-orange-500/12 text-orange-600`
- `info` : `border-transparent bg-blue-500/12 text-blue-600`
- Padding augmente a `px-3 py-1` et texte a `text-[13px]`

**index.css** - Utilitaires :
```css
.ios-tinted-blue { background: hsl(211 100% 50% / 0.12); color: hsl(211 100% 50%); }
.ios-tinted-green { background: hsl(142 76% 36% / 0.12); color: hsl(142 76% 36%); }
.ios-tinted-red { background: hsl(0 100% 59% / 0.12); color: hsl(0 100% 59%); }
.ios-tinted-orange { background: hsl(28 100% 50% / 0.12); color: hsl(28 100% 50%); }
.ios-gradient-btn { background: linear-gradient(180deg, hsl(211 100% 55%) 0%, hsl(211 100% 45%) 100%); }
```

## Resultat attendu
L'app conserve son fond blanc iOS clean mais les elements interactifs (boutons, badges, filtres, chips) deviennent plus vivants et colores avec des teintes douces et des degrades subtils, comme dans le screenshot iOS fourni.

