
## Problème
Un trait gris sépare le header "Messages" de la barre de recherche rapide (Profils/Contacts/Clubs/Strava). L'utilisateur veut que les deux blocs soient parfaitement collés sans séparateur visible.

## Cause
Dans `src/pages/Messages.tsx` ligne 2880, le wrapper du header de la liste des conversations applique `border-b border-border` :
```tsx
headerWrapperClassName="z-50 border-b border-border bg-card"
```
Comme la barre de recherche rapide qui suit a déjà été aplatie (`!rounded-t-none border-t-0`), c'est cette bordure du header qui crée le trait visible.

## Correction
Retirer `border-b border-border` du `headerWrapperClassName` du header de la liste de conversations (ligne 2880) :
```tsx
headerWrapperClassName="z-50 bg-card"
```

Aucune autre modification nécessaire — la barre de recherche rapide reste collée et le fond `bg-card` assure la continuité visuelle avec le header.

## Fichier modifié
- `src/pages/Messages.tsx` (1 ligne)
