## Refonte du design — page « Gérer le club »

Refonte complète de `ClubManagementDialog.tsx` pour passer d'une longue liste iOS Settings à une expérience **premium, plus visuelle, hiérarchisée et agréable à scroller**, dans la lignée du langage de design RunConnect (Komoot/Strava-like, iOS premium).

### Nouveau layout (de haut en bas)

```
┌─────────────────────────────────────────┐
│  ← Gérer le club            (header)    │
├─────────────────────────────────────────┤
│                                         │
│        ╭─────────────────╮              │
│        │   AVATAR 96px   │  ← bouton    │
│        │   gradient ring │     caméra   │
│        ╰─────────────────╯              │
│            Nom du club                  │
│        Description courte               │
│                                         │
│   ┌────────┬────────┬────────┐          │
│   │  12    │   3    │   2    │  stats   │
│   │membres │ coachs │ admins │  inline  │
│   └────────┴────────┴────────┘          │
│                                         │
│   [ Inviter ]  [ Partager code ]        │  ← CTA pills
├─────────────────────────────────────────┤
│  CODE D'INVITATION (carte dédiée)       │
│  ┌────────────────────────────────┐     │
│  │  ABC-123-XYZ      [📋 copier]  │     │
│  │  Partagez ce code…             │     │
│  └────────────────────────────────┘     │
├─────────────────────────────────────────┤
│  INFORMATIONS                           │
│  • Nom du club          ›               │
│  • Description          ›               │
│  • Photo du club        ›               │
├─────────────────────────────────────────┤
│  MEMBRES (12)            [+ Inviter]    │
│  Filtres: [Tous] [Coachs] [Admins]      │
│                                         │
│  ▸ Avatar  Nom         [Coach][Admin] ⋯ │
│  ▸ Avatar  Nom               [Athlète]⋯ │
│  …                                      │
├─────────────────────────────────────────┤
│  ZONE DANGER                            │
│  🗑  Supprimer le club                   │
└─────────────────────────────────────────┘
```

### Améliorations clés

1. **En-tête héro premium**
   - Avatar 96px avec anneau gradient subtil (primary → primary/40), ombre douce.
   - Bouton caméra repensé (glassmorphism léger, ring blanc).
   - Nom du club en gros (24px, bold), description en dessous (15px, muted).
   - Suppression du bloc « Informations » dupliqué pour le nom : édition via tap direct sur le nom (sheet modale) → plus naturel.

2. **Bandeau de stats inline**
   - 3 chiffres (membres / coachs / admins) sur fond `bg-secondary/60`, divisés par séparateurs verticaux fins.
   - Donne immédiatement le pouls du club.

3. **Deux CTA principaux** côte à côte sous le héro
   - « Inviter » (primary, rempli) et « Partager le code » (secondary, outline).
   - Action attendue immédiatement accessible, pas enterrée en bas.

4. **Code d'invitation en carte dédiée** (au lieu d'une ligne de liste)
   - Code en mono, large, lisible.
   - Bouton « Copier » explicite + feedback visuel (icône check pendant 1.5s).
   - Sous-titre explicatif court.

5. **Liste des membres revisitée**
   - Filtres rapides en chips (Tous / Coachs / Admins) → utile dès qu'il y a >5 membres.
   - Carte par membre : avatar 40px, nom + handle, badges de rôle compacts (Admin doré, Coach violet).
   - Actions condensées dans un menu **⋯** (DropdownMenu) au lieu de 2 boutons icône → moins chargé visuellement. Options : Promouvoir/Rétrograder coach, Retirer du membre, Voir profil.
   - Bouton « Inviter des membres » devient un IOSListItem avec icône `UserPlus` en haut de la liste, bien visible.
   - Un seul `<div>` parent par ligne avec `divide-y` au lieu du séparateur absolute → plus propre.

6. **Édition inline → bottom sheet**
   - Plus d'inputs qui apparaissent au milieu de la liste (cassait le rythme visuel).
   - Tap sur « Nom du club » ou « Description » → ouvre une petite Sheet en bas avec champ + bouton Enregistrer (style iOS).

7. **Zone danger isolée visuellement**
   - Carte avec bordure rouge subtile (`border-destructive/20`), fond `bg-destructive/5`.
   - Icône poubelle blanche sur fond rouge, texte rouge.

8. **Détails de polish**
   - Espacement vertical augmenté entre sections (gap-5 au lieu de gap-3).
   - Background `bg-secondary/40` pour mieux faire ressortir les cartes blanches.
   - Animation fade-in subtile au mount.
   - Skeleton loading pendant le chargement initial des membres.

### Changements techniques

- **Fichier modifié** : `src/components/coaching/ClubManagementDialog.tsx` (refactor complet du JSX, logique data préservée).
- **Nouveau sous-composant** : `EditFieldSheet` (inline dans le fichier ou extrait) — petite Sheet réutilisable pour éditer nom / description.
- **Nouveau sous-composant** : `MemberRow` — extrait pour clarifier la lecture, avec `DropdownMenu` pour les actions admin.
- Utilisation des composants existants : `Sheet`, `DropdownMenu`, `IOSListGroup`, `IOSListItem`, `Badge`, `Avatar`.
- Aucune nouvelle dépendance.
- Aucun changement de schéma DB ni de hooks.
- Comportement fonctionnel identique : toutes les actions (édition nom/desc, upload avatar, copie code, invite, promotion coach, retrait membre, suppression club) restent en place.

### Hors scope

- Pas de changement sur `InviteMembersDialog` ni sur `ImageCropEditor`.
- Pas de nouvelles fonctionnalités (groupes, invitations en attente, etc.) — uniquement refonte visuelle de l'existant.