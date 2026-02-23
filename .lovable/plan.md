

## Aligner verticalement l'heure et l'appareil photo

### Modification unique - `src/pages/Messages.tsx`

Deplacer l'heure (actuellement dans la ligne du nom d'utilisateur, ligne ~2541-2555) vers une colonne droite partagee avec le bouton camera.

**Avant** : L'heure est dans le header row (a cote du nom), le camera est en dehors, plus bas.

**Apres** : L'heure et le camera sont dans un meme conteneur `flex flex-col items-center justify-center gap-1` place a droite de la conversation, les deux elements empiles verticalement et centres.

### Detail technique

1. Supprimer le `<span>` de l'heure de la ligne 2541-2555 (dans le header row du nom)
2. Remplacer le bouton camera seul (lignes 2593-2604) par un conteneur vertical contenant l'heure AU-DESSUS du bouton camera :

```tsx
{/* Colonne droite: heure + camera */}
<div className="flex flex-col items-center justify-center gap-1 flex-shrink-0 ml-2">
  <span className="text-[13px] text-muted-foreground">
    {/* logique de date existante */}
  </span>
  {!isSelectionMode && (
    <button
      className="p-1 rounded-full active:bg-secondary transition-colors"
      onClick={(e) => {
        e.stopPropagation();
        handleQuickCameraForConversation(conversation);
      }}
    >
      <Camera className="h-5 w-5 text-muted-foreground" />
    </button>
  )}
</div>
```

Resultat visuel :
```
[ Avatar ]  [ Nom d'utilisateur        ]  [  14h  ]
            [ Dernier message...       ]  [  cam   ]
```

