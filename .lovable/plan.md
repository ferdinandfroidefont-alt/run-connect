

## Fix: Barre de prolongement dans la zone du notch (safe area) sur 3 pages

### Probleme
Sur iPhone, les pages "Mon Profil", "Creer une seance" et "Details de la seance" n'ont pas de fond qui s'etend dans la zone du notch (au-dessus du bouton "Retour"). On voit le fond du WebView au lieu du fond du header.

### Constat apres analyse
- **Profile.tsx**: a deja `pt-safe` sur le header -- OK
- **CreateSessionWizard.tsx**: le header n'a PAS `pt-safe` -- le fond ne couvre pas le notch
- **SessionDetailsDialog.tsx**: le header n'a PAS `pt-safe` -- le fond ne couvre pas le notch

Le composant `DialogContent` est en plein ecran sur mobile (`w-full h-full`), donc le header du dialog doit lui-meme gerer la safe area avec `pt-safe`.

### Solution
Ajouter `pt-safe` au `div` du header iOS dans les deux fichiers concernes.

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/components/session-creation/CreateSessionWizard.tsx` | Ajouter `pt-safe` au div du header (ligne 401) |
| `src/components/SessionDetailsDialog.tsx` | Ajouter `pt-safe` au div du header (ligne 431) |

Aucune modification de taille ni de position des elements existants -- on ajoute uniquement le padding top pour couvrir la zone du notch.

