

## Corrections iOS multiples - 8 problemes

### 1. Trou entre la carte et la barre de navigation
**Cause**: Le padding bottom du Layout (`ios-nav-padding`) utilise 64px mais la vraie hauteur de la nav sur iOS est reduite a 64px via `.h-[72px]`. Le probleme est que le `pb-[calc(72px+...)]` par defaut est trop grand.
**Solution**: Dans `src/index.css`, ajuster `.ios-nav-padding` pour utiliser exactement la bonne valeur et s'assurer que la carte s'etend jusqu'a la nav. Reduire a `calc(64px + env(safe-area-inset-bottom, 0px))` (deja fait) mais aussi verifier que le Layout ne cause pas de gap supplementaire. Le vrai probleme est que le `pb-[calc(72px+...)]` par defaut dans Layout.tsx s'applique avant le CSS iOS. Changer le Layout pour que la classe `ios-nav-padding` s'applique correctement.

### 2. "Runconnect" desaligne avec cloche et parametres
**Cause**: Le header utilise `py-8` (beaucoup de padding vertical) et le titre est `text-xl`. Sur iOS avec le compact mode, les elements ne sont pas sur la meme ligne visuelle.
**Solution**: Dans `src/components/InteractiveMap.tsx` ligne 1382, reduire `py-8` a `py-3` et changer le titre de `text-xl` a `text-lg` pour un alignement correct. Ajouter `items-center` explicitement au conteneur flex.

### 3. Filtre et Maximize a la meme hauteur que les creneaux horaires
**Cause**: Le bloc filtre/maximize est positionne a `top: calc(9.5rem + safe-area)` tandis que les creneaux sont dans le flux du search bar.
**Solution**: Dans `src/index.css`, ajuster `.ios-map-filters` de `8rem` a `7rem` pour remonter le bloc filtre/maximize sur iPhone.

### 4. Latence sur les boutons de navigation (performance)
**Cause**: Le `BottomNavigation` fait des requetes Supabase en boucle (fetchUnreadCount itere sur chaque conversation individuellement). Cela cree de la latence a chaque interaction.
**Solution**: Optimiser `fetchUnreadCount` dans `src/components/BottomNavigation.tsx` pour utiliser une seule requete SQL au lieu d'iterer sur chaque conversation. Utiliser un `.in()` filter ou un RPC.

### 5. Status bar area qui reapparait apres ConfirmPresence et Search
**Cause**: Les routes `/confirm-presence` et `/search` ne sont PAS dans `<Layout>` (voir App.tsx lignes 69, 75). Quand ces pages utilisent `document.body.style.overflow = 'hidden'` ou naviguent en arriere, elles ne restaurent pas proprement l'etat du viewport. Le probleme principal: ces pages n'ont pas de fond qui couvre la safe area, et au retour le WebView peut montrer un fond different.
**Solution**: Ajouter `pt-safe` et un fond `bg-background` couvrant la zone safe-area dans `src/pages/ConfirmPresence.tsx` et `src/pages/Search.tsx` pour le header. Egalement ajouter un cleanup dans le useEffect de Search.tsx pour restaurer l'overflow.

### 6. Photos de profil deformees dans Messages
**Cause**: Le CSS iOS compact reduit `.h-10.w-10` a `2rem` mais l'avatar utilise `h-[52px] w-[52px]` qui n'est pas affecte. Le vrai probleme est que le conteneur flex parent compresse l'avatar. La classe `aspect-square shrink-0` a ete ajoutee mais le `w-[52px]` peut etre ecrase par des styles parents.
**Solution**: Ajouter `min-w-[52px] min-h-[52px]` a l'Avatar dans Messages.tsx pour forcer les dimensions minimales et empecher la compression.

### 7. Flammes (StreakBadge) deplacees sous la photo de profil
**Changement Android + iPhone**: Deplacer le `StreakBadge` du header (a cote de la cloche) vers sous l'avatar central sur la page principale.
**Solution**: Dans `src/components/InteractiveMap.tsx`:
- Retirer `{user && <StreakBadge userId={user.id} variant="compact" />}` du bloc right-aligned (ligne 1402)
- Ajouter un petit `StreakBadge` sous l'avatar central (apres la ligne 1397), avec une taille reduite.

### 8. Barre de prolongement au-dessus du bouton retour (Profil etc.)
**Cause**: Les pages Profil, Leaderboard, Settings avaient des divs fixed pour le notch qui ont ete supprimes. Il manque maintenant une continuite visuelle.
**Solution**: Le `pt-safe` deja present sur les headers assure la continuite. Verifier que le fond du header (`bg-card`) s'etend bien dans la safe area grace a `pt-safe`. Si ce n'est pas le cas, ajouter un `div` de fond avec `bg-card` qui couvre la zone safe-area en haut.

---

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/index.css` | Ajuster `.ios-map-filters` (7rem) |
| `src/components/InteractiveMap.tsx` | Reduire py du header, titre plus petit, deplacer StreakBadge sous avatar |
| `src/components/BottomNavigation.tsx` | Optimiser fetchUnreadCount en une seule requete |
| `src/pages/ConfirmPresence.tsx` | Ajouter fond safe-area pour eviter la status bar au retour |
| `src/pages/Search.tsx` | Ajouter fond safe-area pour eviter la status bar au retour |
| `src/pages/Messages.tsx` | Ajouter min-w/min-h aux avatars pour eviter la deformation |
| `src/pages/Profile.tsx` | Verifier la continuite bg-card dans la safe area |

