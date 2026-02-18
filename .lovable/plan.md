

## Corrections iOS - 3 problemes restants

### 1. Trou entre la carte et la barre de navigation
**Cause**: Le Layout utilise `pb-[calc(72px+env(safe-area-inset-bottom,0px))]` par defaut, puis le CSS iOS override avec `.ios-nav-padding` a `calc(64px+...)`. Cependant, la carte (`InteractiveMap`) est en `h-full` dans un conteneur `flex-1 min-h-0 h-0`. Le probleme est que le padding bottom cree un espace entre le bas de la carte et la nav. La carte doit descendre plus bas.
**Solution**: Reduire le padding bottom iOS a `calc(60px + env(safe-area-inset-bottom, 0px))` dans `.ios-nav-padding` pour que la carte colle a la nav. Egalement ajuster le padding par defaut dans Layout.tsx de `72px` a `68px` pour reduire le gap meme sur Android.

### 2. Flammes (StreakBadge) integrees dans la photo de profil
**Cause**: Actuellement le StreakBadge est place sous l'avatar dans un `div` separe avec `mt-0.5`. Il doit etre integre directement dans l'avatar, en petit, en bas a droite (comme un badge de statut en ligne).
**Solution**: Dans `src/components/InteractiveMap.tsx`, deplacer le StreakBadge en position absolue en bas de l'avatar avec une taille reduite. Le wrapper de l'avatar doit devenir `relative` et le badge positionne en `absolute -bottom-1 -right-1` avec une echelle reduite (`scale-75`).

### 3. Status bar area qui reapparait apres Search/ConfirmPresence
**Cause**: Les pages Search et ConfirmPresence utilisent `fixed inset-0` mais sans couvrir la safe area du haut avec le meme fond. Quand on quitte ces pages, le WebView montre brievement un fond different dans la zone du notch. Le header de Search a `pt-safe` sur le header mais le conteneur principal n'a pas de fond qui s'etend dans la safe area.
**Solution**: Ajouter `pt-safe` directement sur le conteneur principal `fixed inset-0` des pages Search et ConfirmPresence (pas seulement sur le header interne), pour que le fond du conteneur couvre toute la zone safe area.

---

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/index.css` | Reduire `.ios-nav-padding` de 64px a 60px |
| `src/components/Layout.tsx` | Reduire pb par defaut de 72px a 68px |
| `src/components/InteractiveMap.tsx` | Integrer StreakBadge en position absolue dans l'avatar (petit, bas-droite) |
| `src/pages/Search.tsx` | Ajouter `pt-safe` au conteneur principal |
| `src/pages/ConfirmPresence.tsx` | Ajouter `pt-safe` au conteneur principal |

