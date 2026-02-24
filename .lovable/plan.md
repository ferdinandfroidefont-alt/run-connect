

# Calendrier Coach visible par défaut à l'ouverture du club

## Problème
Actuellement, quand on clique sur un club, le `ClubInfoDialog` s'ouvre avec l'onglet "Membres" par défaut (`<Tabs defaultValue="members">`). Le calendrier coach est caché dans l'onglet "Entraînements". L'utilisateur veut que le calendrier et les séances soient visibles directement.

## Solution

Changer le `defaultValue` des `Tabs` dans `ClubInfoDialog.tsx` de `"members"` à `"coaching"` pour que l'onglet Entraînements (avec le calendrier + séances) soit affiché en premier quand on ouvre le club.

## Détail technique

| Fichier | Modification |
|---|---|
| `src/components/ClubInfoDialog.tsx` (ligne 415) | `defaultValue="members"` → `defaultValue="coaching"` |

Un seul changement d'une ligne. Le calendrier semaine avec les séances du jour et le détail au clic sont déjà fonctionnels dans `CoachingTab`.

