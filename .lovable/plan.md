## Refonte complète de la page Profil

### Analyse de la maquette

D'après l'image annotée, la nouvelle page profil doit avoir :

1. **Header** : barre retour habituelle de l'app (flèche ←) + nom tronqué en titre + trois petits points (menu ···) pour signaler/bloquer
2. **Section identité** : Photo de profil à gauche + à droite : pseudo, âge,, sport favoris ,  pays (drapeau)
3. **Stats** : SUIVIS X | FOLLOWERS Y (cliquables)+ bouton "envoyer un message" à côté 
4. **Bio** : texte bio
5. **Onglets filtrables** : TOTAUX | 30 JOURS | 7 JOURS
6. **Contenu sous onglets** : Séances créées > avec le nombres , Itinéraires créés avec le nombre , et uniquement pour ses 2 Séances rejointes, Records sport  unqiuement pour item cliquable ouvre une page dédiée
7. **Séances récentes** : bouton en bas qui ouvre une page avec liste de séances (style feed)

### Architecture

**Fichier principal** : `src/pages/Profile.tsx` — refonte complète

**Ce qui est conservé** :

- Toute la logique data (fetchProfile, fetchFollowCounts, updateProfile, uploadAvatar, etc.)
- Les sous-composants existants (`ProfileQuickStats`, `SportsBadges`, `ProfileStatsGroup`, `PersonalRecords`, `RecentActivities`)
- Les dialogs (FollowDialog, SettingsDialog, ReportUserDialog, ImageCropEditor, AdminPremiumManager)
- Le `ProfilePreviewDialog` (utilisé quand on consulte un autre profil)

**Ce qui change** :

- Suppression du cover image hero (bandeau Facebook-style)
- Nouveau layout iOS Inset Grouped :
  - Header sticky avec titre tronqué + bouton retour + menu ···
  - Section identité horizontale : avatar à gauche, infos à droite (pseudo, âge, sports favoris avec drapeaux)
  - Bouton message à côté (pour profil tiers)
  - Ligne "Suivis X | Followers Y" cliquable
  - Bio sous les stats
  - **Onglets période** (Totaux / 30 jours / 7 jours) pour filtrer les stats ci-dessous
  - Groupe iOS inset : Séances créées, Itinéraires créés, Séances rejointes, Records sport — chaque ligne cliquable avec ChevronRight, ouvre une page/dialog
  - Bouton "Séances récentes" en bas, ouvre un dialog/page avec la liste

### Détails techniques

**Header** :

- `sticky top-0 z-20 bg-secondary` avec `ArrowLeft` (navigate(-1) si viewing other, sinon hidden) + titre tronqué `truncate max-w-[200px]` + `MoreVertical` dropdown (Signaler, Bloquer pour tiers / Paramètres pour soi)

**Section identité** :

- Layout horizontal `flex items-center gap-4 px-4 py-4`
- Avatar 80px à gauche avec badge premium
- À droite : display_name (bold), @username (muted), âge, SportsBadges inline
- Pour profil tiers : bouton MessageCircle à côté

**Stats Suivis/Followers** :

- Ligne horizontale simple avec séparateur, cliquable → ouvre FollowDialog

**Onglets période** :

- `useState<'total' | '30days' | '7days'>('total')`
- 3 boutons style tabs iOS (bg-card rounded-lg, bouton actif en primary)
- Filtre passé aux composants de stats

**Groupe liens (IOSListGroup style)** :

- Séances créées → count dynamique → ouvre `/my-sessions`
- Itinéraires créés → count dynamique → navigue vers routes
- Séances rejointes → count dynamique → ouvre `/my-sessions`
- Records sport → ouvre un dialog PersonalRecords
- Chaque ligne = IOSListItem avec icône colorée, titre, valeur, ChevronRight

**Séances récentes** :

- Bouton large en bas (style card cliquable) → ouvre un dialog plein écran avec `RecentActivities` en version longue

### Fichiers modifiés

1. `**src/pages/Profile.tsx**` — Refonte complète du rendu, conservation de toute la logique existante

Le `ProfilePreviewDialog` reste inchangé (utilisé pour les profils tiers via route `/profile/:userId`).