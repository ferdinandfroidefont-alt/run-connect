

## Supprimer la notification "Contacts synchronisés"

### Probleme

Quand on clique sur "Rechercher contacts", une fois les contacts synchronises, un toast apparait avec le message "Contacts synchronises - X contact(s) trouve(s) sur l'application". Cette notification est superflue.

### Correction

#### Fichier : `src/components/search/ContactsTab.tsx`

- **Supprimer le bloc toast** aux lignes 169-172 qui affiche la notification apres le chargement des contacts. Les resultats sont deja visibles directement dans la liste, donc le toast n'apporte rien.

