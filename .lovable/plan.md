

## Harmoniser la barre de retour du mode Suivi avec les autres pages

### Constat

La page Suivi d'itineraire a deux barres de retour differentes selon l'etat :
1. **Ecran de chargement** (loading) : le bouton est place directement en `absolute` avec un `mt-2` supplementaire qui le pousse vers le bas. Il n'est pas entoure d'une barre d'en-tete structuree comme sur les autres pages.
2. **Ecran principal** (carte chargee) : la barre est identique a celle du mode immersif de la carte interactive -- pas de probleme ici.

Le souci vient donc principalement de l'ecran de chargement et d'erreur, ou le bouton est "flottant" au lieu d'etre dans une barre structuree.

### Correction

**Fichier : `src/pages/TrainingMode.tsx`**

Remplacer le bouton flottant de l'ecran de chargement par la meme barre d'en-tete structuree utilisee sur l'ecran principal et sur la carte interactive :

```tsx
// Ecran de chargement - AVANT (bouton flottant, trop bas)
<Button className="absolute top-[env(safe-area-inset-top)] left-4 mt-2 ..." style={{ position: 'absolute', zIndex: 10000 }}>

// Ecran de chargement - APRES (barre identique aux autres pages)
<div className="absolute top-0 left-0 right-0 z-[9999] bg-card pt-[env(safe-area-inset-top)]">
  <div className="flex items-center px-4 py-2 border-b border-border/30">
    <Button variant="ghost" size="sm" className="px-0 font-normal">
      <ArrowLeft className="h-5 w-5 mr-1" />
      Retour
    </Button>
  </div>
</div>
```

Meme correction pour l'ecran d'erreur.

### Resultat
- Barre de retour identique sur les 3 etats (chargement, erreur, carte)
- Alignement vertical identique a la carte interactive en mode immersif
- Suppression du `mt-2` et du `style={{ position: 'absolute', zIndex: 10000 }}` en trop

### Fichier modifie

| Fichier | Modification |
|---------|-------------|
| `src/pages/TrainingMode.tsx` | Unifier la barre retour loading/erreur avec le meme composant que l'ecran principal |

