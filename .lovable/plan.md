

# Boutons/cartes flush bord-à-bord (style Paramètres iOS)

Aligner les listes et cartes de ClubInfoDialog, WeeklyTrackingView et CoachingTab pour qu'elles touchent les bords gauche et droit, comme dans les pages Paramètres.

## Changements

### 1. `src/components/ClubInfoDialog.tsx`
- Changer le wrapper de contenu de `p-4` à `py-4 px-0` (ou `bg-secondary py-4`)
- Les `TabsList` et boutons d'action gardent un `px-4` interne
- Les listes de membres : retirer `rounded-lg`, utiliser `bg-card overflow-hidden rounded-none`

### 2. `src/components/coaching/WeeklyTrackingView.tsx`
**Mode liste :**
- Barre de recherche : garder `px-4` pour le padding
- Liste athlètes : `rounded-xl border` → `rounded-none` sans border (flush)
- Empty state : `rounded-2xl` → `rounded-none`

**Mode détail :**
- Carte profil hero : `rounded-2xl border` → `rounded-none` sans border
- Week navigation : `rounded-2xl border` → `rounded-none` sans border
- Stats card : `rounded-2xl border` → `rounded-none` sans border
- Liste séances : `rounded-xl border` → `rounded-none` sans border
- Commentaires : `rounded-xl border` / `rounded-2xl border` → `rounded-none` sans border
- Bouton "Continuer le plan" : `rounded-2xl` → garder padding via `px-4` wrapper
- `TabsList` : garder arrondi interne

### 3. `src/components/coaching/CoachingTab.tsx`
- Le wrapper utilise déjà `-mx-4` mais applique `px-4` partout
- Hero Card : retirer arrondi, flush
- Tools grid : garder avec `px-4` (ce sont des boutons carrés, pas des listes)
- `IOSListGroup` : déjà `flush` ✓
- `IOSListGroup` "Prochaines séances" : déjà `flush` ✓

### 4. `src/components/coaching/WeeklyTrackingDialog.tsx`
- Le conteneur enfant a `py-4` → ajouter `px-0` pour que WeeklyTrackingView soit flush
- Ajouter `px-4` seulement sur la barre de recherche dans WeeklyTrackingView

Principe appliqué partout : les `bg-card` touchent les bords, les inputs/boutons isolés gardent un `px-4`.

