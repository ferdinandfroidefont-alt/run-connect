
## Remettre la barre du mode immersif a son etat original

### Probleme
La barre iOS style a ete appliquee sur le mode immersif de InteractiveMap.tsx alors qu'elle devait rester uniquement sur TrainingMode.tsx. Il faut annuler ce changement sur InteractiveMap.

### Modification

**Fichier : `src/components/InteractiveMap.tsx`** (lignes 1363-1382)

Remettre la barre du mode immersif a son style original avec le bouton "Retour" simple :

```tsx
{isImmersiveMode && (
  <div className="absolute top-0 left-0 right-0 z-10 bg-card pt-[env(safe-area-inset-top)]">
    <div className="flex items-center px-4 py-2 border-b border-border/30">
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleImmersiveMode}
        className="px-0 font-normal"
      >
        <ArrowLeft className="h-5 w-5 mr-1" />
        Retour
      </Button>
    </div>
  </div>
)}
```

Supprimer l'import de `ChevronLeft` de lucide-react (il n'est plus utilise dans ce fichier).

**Aucun changement sur TrainingMode.tsx** — la barre iOS y est deja correcte.
