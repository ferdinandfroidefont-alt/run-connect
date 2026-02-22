

# Header et Tab Bar unifies avec pattern sportif en degrade

## Concept

Les deux barres (header en haut et tab bar en bas) partagent la meme couleur de fond `#1d283a`. Depuis chaque barre, un pattern sportif (icones/dessins de sport) se diffuse en degrade vers le centre de l'ecran, dense pres de la barre et de plus en plus transparent, creant une transition visuelle naturelle avec le contenu.

## Changements prevus

### 1. Tab Bar plus compacte (`src/components/BottomNavigation.tsx`)

- Reduire la hauteur de `h-[72px]` a `h-[56px]`
- Changer le fond de `bg-background` a la couleur `#1d283a` en dur (fond sombre unifie)
- Reduire le bouton central "+" de `h-[52px] w-[52px]` a `h-[44px] w-[44px]`
- Supprimer la condition `if (hideBottomNav) return null;` pour que la tab bar soit presente sur toutes les pages (sauf quand on est dans une conversation ouverte, ou elle reste cachee)
- Texte et icones en blanc/clair pour la lisibilite sur fond sombre

### 2. CSS - Degrade pattern sportif (`src/index.css`)

Ajouter deux pseudo-elements ou classes utilitaires :

- `.sport-pattern-top::after` : un overlay en position absolute sous le header, avec le pattern sportif (`/patterns/sports-pattern.png`), masque par un degrade lineaire (opaque en haut, transparent en bas), hauteur ~120px
- `.sport-pattern-bottom::before` : meme principe au-dessus de la tab bar (opaque en bas, transparent en haut), hauteur ~120px

Ces overlays utilisent `mask-image: linear-gradient(to bottom, rgba(0,0,0,0.15), transparent)` (pour le haut) et l'inverse pour le bas, creant l'effet de diffusion du pattern.

### 3. Header de la carte (`src/components/InteractiveMap.tsx`)

- Changer le fond du header de `bg-card` a `bg-[#1d283a]`
- Supprimer `bg-pattern` du header (le pattern sera gere par le degrade CSS)
- Texte "Runconnect" en blanc
- Ajouter la classe `.sport-pattern-top` pour le degrade de pattern sous le header

### 4. Headers des autres pages

Pour chaque page qui a un header (MySessions, Feed, Messages, Leaderboard, Profile, etc.) :

- **`src/pages/MySessions.tsx`** : changer le header `bg-card` en `bg-[#1d283a]` + texte blanc + classe pattern
- **`src/components/feed/FeedHeader.tsx`** : meme traitement
- **`src/pages/Messages.tsx`** : header de la liste de conversations, meme traitement
- **`src/pages/Leaderboard.tsx`** : meme traitement
- **`src/pages/Profile.tsx`** : meme traitement

### 5. Layout global (`src/components/Layout.tsx`)

- Ajouter la classe `.sport-pattern-bottom` au conteneur principal pour que le degrade de pattern apparaisse au-dessus de la tab bar sur toutes les pages
- Le `bg-pattern` existant sur le div racine sera conserve ou remplace selon le rendu

### 6. Supprimer `hideBottomNav` pour la plupart des cas

Actuellement, la tab bar est cachee sur certaines pages (conversations ouvertes, etc.). On la garde cachee uniquement quand une conversation est ouverte (car la barre d'envoi de message prend sa place), mais elle sera visible partout ailleurs.

## Details techniques CSS du degrade pattern

```text
+-----------------------------------+
|  HEADER (fond #1d283a)            |
+-----------------------------------+
|  Pattern sportif opacite 15%      |  <-- degrade de pattern (top)
|  ....de moins en moins visible....| 
|  .................................|
|                                   |
|       CONTENU DE LA PAGE          |
|                                   |
|  .................................|
|  ....de plus en plus visible......|  <-- degrade de pattern (bottom)
|  Pattern sportif opacite 15%      |
+-----------------------------------+
|  TAB BAR (fond #1d283a)           |
+-----------------------------------+
```

L'effet est obtenu avec CSS `mask-image` applique sur un overlay qui contient le `background-image` du pattern sportif. Le mask cree le degrade d'opacite.

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/index.css` | Classes `.sport-pattern-top` et `.sport-pattern-bottom` avec mask-image |
| `src/components/BottomNavigation.tsx` | Hauteur reduite, fond `#1d283a`, texte clair, visible sur toutes les pages |
| `src/components/Layout.tsx` | Ajout du pattern bottom, ajustement du padding |
| `src/components/InteractiveMap.tsx` | Header fond `#1d283a`, texte blanc, classe pattern top |
| `src/components/feed/FeedHeader.tsx` | Fond `#1d283a`, texte blanc, classe pattern top |
| `src/pages/MySessions.tsx` | Header fond `#1d283a`, texte blanc |
| `src/pages/Messages.tsx` | Header liste fond `#1d283a`, texte blanc |
| `src/pages/Leaderboard.tsx` | Header fond `#1d283a`, texte blanc |
| `src/pages/Profile.tsx` | Header fond `#1d283a`, texte blanc |

