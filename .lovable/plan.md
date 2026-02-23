

## Corriger le bouton "Sondage" qui ne s'ouvre toujours pas

### Probleme

Le `DropdownMenu` de Radix est **modal par defaut** : il capture le focus et empeche les autres overlays (comme le `Dialog` du sondage) de s'ouvrir correctement apres sa fermeture. De plus, `onSelect` sur le `DropdownMenuItem` a un comportement different de `onClick` utilise par les autres items du menu.

### Correction

#### Fichier : `src/pages/Messages.tsx`

1. **Ajouter `modal={false}`** sur le composant `<DropdownMenu>` (ligne 2187) pour eviter le verrouillage du focus qui bloque l'ouverture du dialog.

2. **Remplacer `onSelect` par `onClick`** sur le `DropdownMenuItem` du sondage (ligne 2229-2232), en coherence avec les autres items du menu, et supprimer le `setTimeout` devenu inutile.

