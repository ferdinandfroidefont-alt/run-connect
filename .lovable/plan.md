

## Diagnostic

Trois vues de profil existent avec des designs inconsistants :

1. **`Profile.tsx` (Mon profil)** — Le meilleur design : couverture Facebook-style, avatar chevauchant, stats row, `ProfileStatsGroup` unifie avec iOS inset grouped. C'est la reference.
2. **`ProfilePreviewDialog.tsx` (profil tiers in-app)** — Couverture + avatar OK, mais le contenu en dessous est eparpille : `ProfileRankCard` et `EarnedBadgesSection` sont des composants separes avec leurs propres styles, pas integres dans un `ProfileStatsGroup`. Pas de `PersonalGoals`. Le design n'est pas aligne avec "Mon profil".
3. **`PublicProfile.tsx` (profil public web)** — Design completement different : pas de couverture, avatar avec bordure primary, pas de stats row (abonnes/abonnements/reputation), design plat basique.

## Plan de refonte

### 1. `ProfilePreviewDialog.tsx` — Aligner sur le design de "Mon profil"

**Objectif** : Remplacer le contenu eparpille par le meme systeme `ProfileStatsGroup` unifie utilise dans `Profile.tsx`.

Changements :
- Remplacer `ProfileRankCard` + `EarnedBadgesSection` separes par `<ProfileStatsGroup userId={...}>` qui contient deja classement, badges, activite dans un bloc iOS unifie
- Integrer `PersonalRecords` a l'interieur du `ProfileStatsGroup` (comme dans `Profile.tsx`)
- Garder la couverture + avatar + stats row existants (deja corrects)
- Supprimer les imports `ProfileRankCard` et `EarnedBadgesSection` devenus inutiles (ils sont inclus dans `ProfileStatsGroup`)
- Conserver les sections specifiques : clubs en commun, actions (unfollow/report), membre depuis

### 2. `PublicProfile.tsx` — Adopter le meme layout Facebook-style

**Objectif** : Passer du design plat a la meme structure couverture + avatar + stats que les autres vues profil.

Changements :
- Ajouter la couverture gradient (comme `Profile.tsx` ligne 656-697) avec l'avatar chevauchant (`marginTop: -50px`)
- Ajouter l'interface `PublicProfile` enrichie : `cover_image_url`, `follower_count`, `following_count` via requetes Supabase
- Ajouter la stats row (Abonnes / Abonnements) sous le nom, identique a `Profile.tsx`
- Ajouter les badges inline (`OrganizerRatingBadge`, `StreakBadge` compact)
- Mettre les boutons d'action (S'abonner / App) dans le meme style que la page profil
- Styliser les sessions recentes dans un `bg-card` avec separateurs iOS identiques
- Utiliser `ring-4 ring-card shadow-xl` pour l'avatar (meme style partout)

### 3. Harmonisation CSS/tailles

- Avatar : `h-24 w-24 ring-4 ring-card shadow-xl` partout (actuellement `h-20 w-20` dans Preview, `h-28 w-28` dans Public)
- Couverture : `h-48` partout (actuellement `h-36` dans Preview)
- Stats row : meme `gap-6`, memes tailles de texte `text-[20px]` / `text-[11px]`
- Nom : `text-[22px] font-bold` + Crown icon pour premium partout

### Fichiers modifies

1. **`src/components/ProfilePreviewDialog.tsx`** — Remplacer le bloc "FOLLOWING: full profile" (lignes 560-650) par `ProfileStatsGroup` unifie ; augmenter la couverture a `h-48` et l'avatar a `h-24 w-24`
2. **`src/pages/PublicProfile.tsx`** — Refonte complete du rendu : couverture + avatar chevauchant + stats row + badges + sessions iOS. Ajout fetch follower/following counts

