

# Passer toutes les pages Coach en plein écran

## Constat

Les 4 dialogs du système Coach utilisent actuellement `<DialogContent className="max-w-md max-h-[90vh]">` — des modales centrées de taille réduite. Le composant `DialogContent` supporte déjà une prop `fullScreen={true}` qui applique `fixed inset-0 z-50 flex flex-col bg-background w-full h-full`.

## Modifications

Ajouter `fullScreen` sur chaque `DialogContent` des composants coaching :

| Fichier | Changement |
|---|---|
| `CoachingSessionDetail.tsx` (ligne 207) | `<DialogContent fullScreen>` + retirer `max-w-md max-h-[90vh] overflow-y-auto` + ajouter `overflow-y-auto flex-1` sur le contenu scrollable |
| `CreateCoachingSessionDialog.tsx` (ligne 210) | `<DialogContent fullScreen>` + retirer `max-w-md max-h-[90vh] overflow-y-auto` |
| `ScheduleCoachingDialog.tsx` (ligne 162) | `<DialogContent fullScreen>` + retirer `max-w-md max-h-[90vh] overflow-y-auto` |
| `CoachAccessDialog.tsx` (ligne 76) | `<DialogContent fullScreen>` + retirer `max-w-sm` |

Pour chaque dialog, le header reste fixe en haut et le contenu scrolle en dessous. Un padding cohérent (`p-4` ou `p-6`) sera ajouté au conteneur principal, et un bouton retour (flèche ou X) sera accessible en haut à gauche pour fermer.

## Détail technique

- `DialogContent` reçoit `fullScreen` → le dialog occupe `100vw × 100vh`
- Le `DialogHeader` devient un header fixe avec `sticky top-0 bg-background z-10 p-4 border-b`
- Le contenu principal utilise `flex-1 overflow-y-auto p-4` pour scroller
- Les boutons d'action restent en bas avec `sticky bottom-0 bg-background p-4 border-t`

Aucune nouvelle dépendance, aucune migration SQL, aucun nouveau fichier.

