

## Réduction de l'espacement

Le conteneur parent utilise `space-y-4` (16px entre chaque enfant), ce qui crée un écart trop grand entre la section Tabs et les boutons d'action en bas.

### Changement

**Fichier : `src/components/ClubInfoDialog.tsx`** — ligne 368

Remplacer `space-y-4` par `space-y-2` sur le `div` conteneur principal du contenu. Cela réduit l'espacement vertical entre tous les blocs (header, code club, tabs, boutons) de 16px à 8px, rendant l'ensemble plus compact et cohérent avec un design mobile.

