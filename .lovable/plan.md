

## Remplacer "Gérer le club" par une page de gestion complète style iOS Settings

### Constat actuel
Le bouton "Gérer le club" ouvre `ClubInfoDialog` — un dialog plein écran avec des onglets (Membres/Entraînements/Groupes) et un design ancien, incohérent avec le style iOS premium du reste de la page Coaching. Il y a aussi `EditClubDialog` qui s'ouvre en cascade depuis `ClubInfoDialog`. Les deux sont redondants et mal intégrés.

### Ce qui va changer

**Supprimer** : `ClubInfoDialog` et `EditClubDialog` ne seront plus utilisés depuis la page Coaching. On retire les imports lazy, les states (`showClubInfo`, `showEditClub`, `clubInfoData`), et le rendu `<Suspense>` correspondant dans `Coaching.tsx`.

**Créer** : Un nouveau composant `ClubManagementDialog` en plein écran, style iOS Settings (fond `bg-secondary`, sections `IOSListGroup` avec titres en majuscules), qui regroupe tout en un seul écran scrollable :

### Structure de la nouvelle page

```text
┌─────────────────────────────┐
│  ← Retour     Gérer le club │
├─────────────────────────────┤
│                             │
│  [Avatar du club]           │
│  Nom du club                │
│  Description                │
│                             │
│  INFORMATIONS               │
│  ┌─────────────────────────┐│
│  │ Nom du club      [Edit] ││
│  │ Description      [Edit] ││
│  │ Photo de profil  [Chg]  ││
│  └─────────────────────────┘│
│                             │
│  CODE D'INVITATION          │
│  ┌─────────────────────────┐│
│  │ ABC123         [Copier] ││
│  └─────────────────────────┘│
│                             │
│  MEMBRES (12)               │
│  ┌─────────────────────────┐│
│  │ Inviter des membres   > ││
│  │ @alice  Admin  Coach    ││
│  │ @bob    Membre    [⚙]  ││
│  │ @charlie Membre   [⚙]  ││
│  └─────────────────────────┘│
│                             │
│  ZONE DANGER                │
│  ┌─────────────────────────┐│
│  │ Supprimer le club       ││
│  └─────────────────────────┘│
│                             │
└─────────────────────────────┘
```

### Fonctionnalités intégrées

1. **Modifier nom/description/avatar** — inline, avec sauvegarde directe (reprend la logique d'`EditClubDialog`)
2. **Code d'invitation** — affiché avec bouton copier (visible uniquement pour le créateur/admin)
3. **Liste des membres** — avec badges Admin/Coach, actions par membre :
   - Promouvoir/rétrograder coach (toggle)
   - Retirer du club (avec confirmation AlertDialog)
4. **Inviter des membres** — recherche utilisateurs intégrée (dialog léger ou section inline)
5. **Supprimer le club** — section danger en bas, avec AlertDialog de confirmation

### Détails techniques

**Fichiers créés :**
- `src/components/coaching/ClubManagementDialog.tsx` — nouveau composant unique (~400 lignes), utilisant `IOSListGroup`, `IOSListItem`, `IosFixedPageHeaderShell`, `CoachingFullscreenHeader`

**Fichiers modifiés :**
- `src/pages/Coaching.tsx` :
  - Supprimer les imports lazy de `ClubInfoDialog` et `EditClubDialog`
  - Supprimer les states `clubInfoData`, `showClubInfo`, `showEditClub`
  - Supprimer la fonction `openClubManagement` (fetch conversation)
  - Supprimer le bloc `<Suspense>` avec les deux dialogs
  - Ajouter un state `showClubManagement` et le nouveau `<ClubManagementDialog>`
  - Le bouton "Gérer le club" appellera simplement `setShowClubManagement(true)`

**Fichiers NON supprimés** (utilisés ailleurs, depuis Messages/ClubProfileDialog) :
- `ClubInfoDialog.tsx` — reste en place
- `EditClubDialog.tsx` — reste en place

### Logique métier reprise
Toute la logique Supabase (load members, toggle coach, remove member, invite, delete club, upload avatar, update name/description) est copiée depuis `ClubInfoDialog` + `EditClubDialog` et consolidée dans le nouveau composant.

