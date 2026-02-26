

## Supprimer les marges horizontales sur toutes les pages coaching

Actuellement, plusieurs pages coaching ont un padding `p-4` sur le conteneur scrollable, ce qui cree un espace entre le contenu et les bords. Il faut passer en `px-4` gere au niveau des enfants (ou retirer le px du parent) pour que les listes et boutons soient bord a bord, comme la page Parametres.

### Fichiers a modifier

| Fichier | Changement |
|---|---|
| `WeeklyTrackingDialog.tsx` (l.43) | `p-4` → `py-4` pour retirer le padding horizontal |
| `CoachingDraftsList.tsx` (l.87) | `p-4 space-y-2` → `py-4 space-y-2` |
| `ClubGroupsManagerDialog.tsx` (l.27) | `p-4` → `py-4` |
| `CoachingTemplatesDialog.tsx` (l.74) | `p-4 space-y-3` → `py-4 px-4 space-y-3` — garder le px ici car le contenu (input + cards) a besoin de marge, mais ajouter `flush` aux groupes si applicable |
| `CoachingSessionDetail.tsx` (l.256) | `p-4 space-y-4` → `py-4 space-y-4`, ajouter `px-4` sur les enfants qui en ont besoin |
| `AthleteWeeklyDialog.tsx` (l.46) | `p-4 bg-secondary` → `py-4 bg-secondary` |
| `CreateCoachingSessionDialog.tsx` (l.243) | `p-4 space-y-4` → `py-4 px-4 space-y-4` — celui-ci est un formulaire, il peut garder le px |
| `ScheduleCoachingDialog.tsx` | Verifier et ajuster de la meme facon |

### Approche

Pour les pages de type **liste** (Tracking, Drafts, Groupes, Templates, SessionDetail), le conteneur parent perd son `px-4` et chaque section interne gere son propre padding horizontal via `px-4` sur les elements non-liste, tandis que les `IOSListGroup` avec `flush` occupent toute la largeur.

Pour les pages de type **formulaire** (CreateSession, Schedule), le `px-4` reste car tout le contenu a besoin de marges.

