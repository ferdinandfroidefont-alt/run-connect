

## Harmoniser la barre du suivi d'itineraire et ajouter la position actuelle

### Changements prevus

**Fichier : `src/pages/TrainingMode.tsx`**

1. **Remplacer la barre iOS** (backdrop-blur, bouton rond ChevronLeft) par le meme style simple que le mode immersif de InteractiveMap : fond `bg-card`, bouton ghost "Retour" avec `ArrowLeft`.

2. **Renommer le titre** de `sessionTitle || 'Entrainement'` en `sessionTitle || 'Suivi d itineraire'`.

3. **Remplacer l'import** de `ChevronLeft` par `ArrowLeft` depuis lucide-react, et importer `Button` depuis `@/components/ui/button`.

4. **Supprimer la boussole flottante** (lignes 254-275) car elle ne fait pas partie du style simple demande.

5. **La position actuelle (point bleu)** est deja implementee (lignes 107-155) via le marker avec pulse. Elle s'affiche des que le GPS repond. Aucun changement necessaire pour ca.

### Detail technique

La barre actuelle (lignes 233-252) sera remplacee par :

```tsx
<div className="absolute top-0 left-0 right-0 z-[9999] bg-card pt-[env(safe-area-inset-top)] pointer-events-auto">
  <div className="flex items-center px-4 py-2 border-b border-border/30">
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => { try { await stopTracking(); } catch {} navigate(-1); }}
      className="px-0 font-normal"
    >
      <ArrowLeft className="h-5 w-5 mr-1" />
      Retour
    </Button>
  </div>
</div>
```

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/pages/TrainingMode.tsx` | Barre simplifiee style immersif, titre "Suivi d'itineraire", suppression boussole, import ArrowLeft + Button |

