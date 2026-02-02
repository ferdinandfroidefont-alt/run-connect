
# Plan : Correction du bug critique de la photo de profil

## Problème identifié

En analysant le code, j'ai trouvé **plusieurs causes potentielles** qui peuvent empêcher l'affichage de la photo :

### 1. Problème du `onClose` dans `ImageCropEditor`
Dans `ImageCropEditor.tsx`, ligne 118-119, quand on clique sur "Valider" :
```typescript
onCropComplete(blob);
onClose();  // ← Appelé IMMÉDIATEMENT après onCropComplete
```

Le `onClose()` dans le dialog peut déclencher une mise à jour du state parent AVANT que `setAvatarPreview()` soit complètement traité, causant un conflit de re-render.

### 2. Problème potentiel avec `onClose` du dialog
Le `onOpenChange={onClose}` du Dialog dans `ImageCropEditor` peut être déclenché lors du clic sur "Valider", et le `onClose` callback du parent (`setShowCropEditor(false)`) peut interférer avec les autres updates de state.

### 3. Double appel de `onClose`
Dans `getCroppedImg()` :
- `onCropComplete(blob)` appelle `handleCropComplete` qui fait `setShowCropEditor(false)`
- Ensuite `onClose()` est appelé aussi, qui fait également `setShowCropEditor(false)`

Ces appels redondants peuvent causer des re-renders inattendus.

### 4. État `isSelectingPhoto` qui reste parfois "true"
Si le crop editor se ferme de manière inattendue, `isSelectingPhoto` peut rester `true` et bloquer des interactions.

## Solution

### Modification 1 : `ImageCropEditor.tsx` - Supprimer le double appel de `onClose`

Le `onCropComplete` du parent gère déjà la fermeture du dialog. Le `onClose()` dans `getCroppedImg` est redondant :

```typescript
// AVANT
canvas.toBlob(
  (blob) => {
    if (blob) {
      onCropComplete(blob);
      onClose();  // ← Redondant !
    }
    setIsProcessing(false);
  },
  'image/jpeg',
  0.9
);

// APRÈS
canvas.toBlob(
  (blob) => {
    if (blob) {
      onCropComplete(blob);
      // Ne PAS appeler onClose() ici - c'est handleCropComplete qui gère la fermeture
    }
    setIsProcessing(false);
  },
  'image/jpeg',
  0.9
);
```

### Modification 2 : `ProfileSetupDialog.tsx` - Séquencer les updates de state

Utiliser une logique qui garantit que la preview est définie AVANT de fermer le dialog :

```typescript
const handleCropComplete = (croppedImageBlob: Blob) => {
  const croppedFile = new File([croppedImageBlob], 'avatar.jpg', { type: 'image/jpeg' });
  
  // Créer la nouvelle preview URL
  const newPreviewUrl = URL.createObjectURL(croppedImageBlob);
  console.log('📸 [ProfileSetup] Preview URL créée:', newPreviewUrl);
  
  // Révoquer l'ancienne preview si elle existe
  if (avatarPreview) {
    URL.revokeObjectURL(avatarPreview);
  }
  
  // Révoquer l'URL de l'image originale
  if (originalImageSrc) {
    URL.revokeObjectURL(originalImageSrc);
  }
  
  // IMPORTANT: Mettre à jour les états dans le bon ordre
  // 1. D'abord définir le fichier et la preview
  setAvatarFile(croppedFile);
  setAvatarPreview(newPreviewUrl);
  
  // 2. Réinitialiser l'originalImageSrc
  setOriginalImageSrc('');
  
  // 3. Fermer le dialog en dernier (utiliser un micro-délai pour garantir le render)
  requestAnimationFrame(() => {
    setShowCropEditor(false);
  });
};
```

### Modification 3 : Ajouter une key dynamique à l'Avatar

Pour forcer le re-render de l'Avatar quand `avatarPreview` change :

```tsx
<Avatar key={avatarPreview || 'no-avatar'} className="h-24 w-24 ring-4 ring-primary/20">
  <AvatarImage src={avatarPreview} />
  <AvatarFallback className="bg-secondary text-2xl">
    {displayName?.[0]?.toUpperCase() || email?.[0]?.toUpperCase() || "?"}
  </AvatarFallback>
</Avatar>
```

### Modification 4 : Améliorer le logging pour diagnostic

Ajouter des logs à chaque étape critique pour diagnostiquer sur Android :

```typescript
useEffect(() => {
  console.log('📸 [ProfileSetup] avatarPreview changé:', avatarPreview?.substring(0, 50) || 'vide');
}, [avatarPreview]);
```

### Modification 5 : Empêcher le dialog de se fermer accidentellement

Dans `ImageCropEditor`, désactiver la fermeture par clic extérieur pendant le traitement :

```tsx
<Dialog 
  open={open} 
  onOpenChange={(isOpen) => {
    // Ne pas permettre la fermeture pendant le traitement
    if (!isProcessing && !isOpen) {
      onClose();
    }
  }}
>
```

## Résumé des modifications

| Fichier | Modification |
|---------|--------------|
| `src/components/ImageCropEditor.tsx` | Supprimer `onClose()` redondant dans `getCroppedImg`, protéger contre fermeture accidentelle |
| `src/components/ProfileSetupDialog.tsx` | Séquencer les updates de state, ajouter key sur Avatar, améliorer logging |

## Pourquoi cette solution fonctionne

1. **Pas de double fermeture** : Le `onCropComplete` gère tout, pas besoin d'appeler `onClose` en plus
2. **Séquence garantie** : `requestAnimationFrame` s'assure que les renders sont faits dans l'ordre
3. **Key dynamique** : Force React à recréer le composant Avatar quand la preview change
4. **Protection anti-fermeture** : Empêche le dialog de se fermer par erreur pendant le traitement
5. **Logging détaillé** : Permet de diagnostiquer le problème exact sur Android
