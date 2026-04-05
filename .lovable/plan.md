

# Refonte complète de la page Profil Utilisateur (ProfilePreviewDialog)

## Portée
Refonte purement UI/UX du composant `ProfilePreviewDialog.tsx` (~600 lignes). Aucune modification de la logique metier, navigation, tab bar ou safe area. Le composant reste un Dialog plein ecran mobile / modal desktop.

## Structure cible (ordre des sections)

```text
┌─────────────────────────────────┐
│  Header : ← Retour  |  Nom  | ⋯│
├─────────────────────────────────┤
│  Avatar  │  Nom + @user         │
│  80x80   │  🇫🇷 France · 24 ans │
│          │  [Online dot]        │
├─────────────────────────────────┤
│  [ Suivre ]  [ Message ]        │
├─────────────────────────────────┤
│  Abonnements │ Abonnés │ Fiabilité│
│     12       │   34    │   94%   │
├─────────────────────────────────┤
│  Bio (si présente)              │
├─────────────────────────────────┤
│  ▸ Séances créées         12    │
│  ▸ Itinéraires créés       3    │
│  ▸ Séances rejointes      28    │
│  ▸ Records sport            >   │
│  ▸ Séances récentes         >   │
├─────────────────────────────────┤
│ OU  🔒 Profil privé            │
│     Suivez pour voir            │
└─────────────────────────────────┘
```

## Fichiers modifies

### 1. `src/components/ProfilePreviewDialog.tsx` — refonte complete du JSX

**Header** (inchange dans la logique, ajustement style)
- Fond `bg-card`, bordure fine, safe-area top
- Grille 3 colonnes : bouton Retour | titre tronque | menu ⋯
- Deja en place, ajustements mineurs de padding

**Bloc Identite** (refonte majeure)
- Layout horizontal : Avatar 72px a gauche, infos a droite
- Ligne 1 : display_name (bold, truncate, 1 ligne) + Crown si premium
- Ligne 2 : @username (truncate, muted)
- Ligne 3 : Pays + Age sur une ligne (`🇫🇷 France · 24 ans`) en utilisant `getCountryLabel` et `profile.age`
- OnlineStatus reste positionne sur l'avatar
- Tous les flex children ont `min-w-0`
- Pas de carte flottante — fond transparent, juste du padding

**Boutons d'action** (sous l'identite, hors carte)
- Deux boutons cote a cote, meme hauteur `h-10`
- Suivre/Abonne = flex-1, Message = flex-1 (visible des que isFollowing)
- `rounded-xl`, style iOS
- Si pas encore suivi : Suivre prend toute la largeur

**Bloc Stats** (3 colonnes egales)
- Remplace le bloc actuel 2 colonnes (Suivis/Abonnes)
- 3 colonnes : Abonnements | Abonnes | Fiabilite
- Separateurs verticaux fins (`w-px bg-border`)
- Chiffre bold en haut, label petit dessous
- Fiabilite cliquable → ouvre `ReliabilityDetailsDialog` existant
- Necessite fetch de `reliability_rate` depuis `user_stats` (ajouter au useEffect existant)

**Bio** (inchange, juste nettoyage style)
- Texte avec `break-words`, pas de carte lourde, juste un fond `bg-card` subtil avec border fine

**Filtre periode** (conserve tel quel — segmented control iOS)

**Bloc Activite** (IOSListGroup)
- Conserve les IOSListItem existants (Seances creees, Itineraires, Seances rejointes, Records, Seances recentes)
- Aucun changement fonctionnel

**Bloc Profil prive** (si !canViewContent)
- Icone Lock (Lucide) au lieu de emoji 🔒
- Texte centre, compact
- Fond `bg-card` avec border fine, `rounded-xl`

### 2. Ajout fetch fiabilite dans ProfilePreviewDialog

- Dans le `fetchProfile` ou un useEffect separe, fetcher `user_stats.reliability_rate` pour le userId
- Stocker dans un state `reliabilityRate`
- Utiliser dans le bloc stats

### 3. Corrections build existantes (en parallele)

Les erreurs de build listees seront corrigees :
- `cleanup-live-tracking/index.ts:47` — cast `(error as Error).message`
- `firebase-auth/index.ts:214-220` — null checks sur `signInData.user` et `.session`
- `process-referral-signup` et `process-referral` — cast supabase client avec `as any`
- `update-streaks/index.ts:41` — cast `(error as Error).message`
- `QRShareDialog.tsx` — importer/declarer `isIosPhone`
- `HomeFeedBottomSheet.tsx` — corriger le type literal `52` en `number`
- `IosFixedPageHeaderShell.tsx` — cast ref avec `as MutableRefObject`
- `WeeklyTrackingView.tsx` — importer/definir `WeekSession`
- `UserProfileContext.tsx` — corriger le type de la query
- Autres erreurs TS listees

## Details techniques

- **Aucun nouveau composant** : tout reste dans `ProfilePreviewDialog.tsx`
- **Imports ajoutes** : `Lock` de lucide-react, `getCountryLabel` de `@/lib/countryLabels`
- **Import existant reutilise** : `ReliabilityDetailsDialog`
- **Pas de modification de** : navigation, Dialog open/close, follow logic, block logic, report logic, sheets records/activities
- **Ellipsis systematique** : tous les textes dans des flex children avec `min-w-0 truncate`
- **Extensibilite** : la structure en sections sequentielles permet d'ajouter facilement avis, historique, stats avancees plus tard

