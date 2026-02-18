

## Corrections multiples iOS - 7 problemes a resoudre

### 1. Augmenter la barre de navigation + combler le trou carte/nav
**Probleme**: La barre de navigation a ete reduite a 58px via CSS iOS, creant un trou entre la carte et la nav.
**Solution**: Augmenter la hauteur iOS de la nav de 58px a 64px dans `src/index.css` (`.ios-nav-padding` et `.h-[72px]` override), ce qui comblera le gap tout en restant compact.

### 2. Remonter la barre de recherche et les boutons en dessous
**Probleme**: Sur iOS, la barre de recherche et les filtres ne sont pas au meme endroit que sur Android.
**Solution**: Ajuster les valeurs `top` dans les classes `.ios-map-search` (de `5.5rem` a `4.5rem`) et `.ios-map-filters` (de `9rem` a `8rem`) dans `src/index.css`.

### 3. Supprimer la "status bar area" (barre coloree du notch)
**Probleme**: Des `div` fixes colorees remplissent la zone du notch sur Profile, Leaderboard et Settings.
**Solution**: Supprimer les 3 lignes `<div className="fixed top-0 ... bg-card" style={{ height: 'env(safe-area-inset-top)' }} />` dans:
- `src/pages/Profile.tsx` (ligne 609)
- `src/pages/Leaderboard.tsx` (ligne 539)
- `src/components/SettingsDialog.tsx` (ligne 411)

### 4. Centrer le QR code dans les parametres
**Probleme**: Le QR code est penche vers la droite dans le dialog.
**Solution**: Dans `src/components/QRShareDialog.tsx`, le `DialogContent` a `max-w-full` en mobile. Le `motion.div` wrapper n'a pas de centrage explicite. Ajouter `mx-auto max-w-sm` au wrapper interne et s'assurer que `flex justify-center` est bien applique au conteneur QR (deja present ligne 279, mais le parent `relative` peut decaler). Corriger en ajoutant `w-full` au wrapper du QR pour forcer le centrage.

### 5. Ecran qui bouge au focus des inputs
**Probleme**: Meme avec `maximum-scale=1.0`, l'ecran se deplace legerement au focus.
**Solution**: Ajouter `touch-action: manipulation` sur les inputs iOS et `position: fixed` au body pendant le focus n'est pas viable. La solution est d'ajouter un listener JS dans `index.html` qui force `window.scrollTo(0,0)` au focus des inputs, car le WebView deplace le viewport. Ajouter dans `src/index.css` sous le bloc iOS:
```css
input:focus, textarea:focus, select:focus {
  transform: translateZ(0);
}
```
Et dans `index.html`, ajouter un script qui reset le scroll au focus.

### 6. Photos de profil deformees sur la page Messages
**Probleme**: Les avatars `h-[52px] w-[52px]` dans la liste des conversations sont deformes.
**Solution**: L'`AvatarImage` utilise `object-cover` mais le CSS iOS reduit `.h-10.w-10` (ligne 397). Le `h-[52px] w-[52px]` n'est pas affecte par cette regle, mais l'avatar circle peut etre ecrase par les reductions iOS de padding. Ajouter `aspect-square shrink-0` explicitement au `Avatar` dans `Messages.tsx` ligne 2423 pour forcer le ratio 1:1.

### 7. Scroll difficile sur OrganizerStatsCard
**Probleme**: Le composant `OrganizerStatsCard` dans `MySessions.tsx` est encapsule dans un `div` avec `px-4`, le scroll du parent est bloque.
**Solution**: Le probleme vient du fait que la page `MySessions` utilise probablement un scroll container qui ne laisse pas assez d'espace en bas. Ajouter `pb-8` au conteneur parent de l'`OrganizerStatsCard` dans `MySessions.tsx` pour garantir que le contenu soit scrollable jusqu'en bas.

---

### Fichiers modifies
| Fichier | Modification |
|---------|-------------|
| `src/index.css` | Ajuster `.ios-nav-padding` (64px), `.ios-map-search` (4.5rem), `.ios-map-filters` (8rem), ajouter anti-scroll-jump CSS |
| `src/pages/Profile.tsx` | Supprimer le div fixed safe-area notch |
| `src/pages/Leaderboard.tsx` | Supprimer le div fixed safe-area notch |
| `src/components/SettingsDialog.tsx` | Supprimer le div fixed safe-area notch |
| `src/components/QRShareDialog.tsx` | Centrer le QR code (ajouter `w-full` au wrapper) |
| `src/pages/Messages.tsx` | Ajouter `aspect-square shrink-0` aux avatars de conversation |
| `src/pages/MySessions.tsx` | Ajouter `pb-8` au conteneur de l'OrganizerStatsCard |
| `index.html` | Ajouter script anti-scroll-jump au focus |

