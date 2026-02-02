
# Plan : Correction définitive du chargement de photo de profil sur Android

## Problème identifié

Quand l'utilisateur sélectionne une photo depuis la galerie sur Android :
1. ✅ Le fichier est bien récupéré via l'input React natif
2. ✅ Le `FileReader` génère une data URL base64
3. ✅ Le dialog `ImageCropEditor` s'ouvre avec `showCropEditor = true`
4. ❌ **L'image ne s'affiche pas** dans le composant de crop - le `<img>` ne charge pas la data URL

## Cause racine

Sur Android WebView, les images générées par `FileReader.readAsDataURL()` peuvent avoir des problèmes :
- **Mémoire limitée** : Les data URLs base64 sont 33% plus grandes que le fichier original
- **Corruption de données** : Certaines WebViews ont des bugs avec les longs data URLs
- **Encodage incorrect** : Le MIME type peut être mal détecté

## Solution : Utiliser `URL.createObjectURL()` au lieu de `FileReader.readAsDataURL()`

`URL.createObjectURL()` crée une référence blob locale (ex: `blob:http://...`) qui est :
- Plus léger en mémoire
- Plus fiable sur Android WebView
- Plus rapide à créer

### Modification 1 : `ProfileSetupDialog.tsx`

Remplacer le `FileReader` par `URL.createObjectURL()` :

```typescript
// AVANT (FileReader - problématique sur Android)
const handleFileSelection = (file: File) => {
  if (!file.type.startsWith('image/')) { ... }
  if (file.size > 5 * 1024 * 1024) { ... }

  const reader = new FileReader();
  reader.onload = (e) => {
    const imageSrc = e.target?.result as string;
    if (imageSrc) {
      setOriginalImageSrc(imageSrc);
      setShowCropEditor(true);
    }
  };
  reader.readAsDataURL(file);
};

// APRÈS (URL.createObjectURL - fiable sur Android)
const handleFileSelection = (file: File) => {
  if (!file.type.startsWith('image/')) { ... }
  if (file.size > 5 * 1024 * 1024) { ... }

  // Créer une URL blob directe - plus fiable sur Android WebView
  const objectUrl = URL.createObjectURL(file);
  console.log('📸 [ProfileSetup] Object URL créée:', objectUrl);
  setOriginalImageSrc(objectUrl);
  setShowCropEditor(true);
};
```

### Modification 2 : Ajouter un nettoyage mémoire

Révoquer les object URLs quand elles ne sont plus nécessaires pour éviter les fuites mémoire :

```typescript
// Dans handleCropComplete
const handleCropComplete = (croppedImageBlob: Blob) => {
  const croppedFile = new File([croppedImageBlob], 'avatar.jpg', { type: 'image/jpeg' });
  setAvatarFile(croppedFile);
  
  // Révoquer l'ancienne preview si elle existe
  if (avatarPreview) {
    URL.revokeObjectURL(avatarPreview);
  }
  
  setAvatarPreview(URL.createObjectURL(croppedImageBlob));
  
  // Révoquer l'URL de l'image originale
  if (originalImageSrc) {
    URL.revokeObjectURL(originalImageSrc);
    setOriginalImageSrc('');
  }
  
  setShowCropEditor(false);
};

// Ajouter un useEffect pour cleanup au démontage
useEffect(() => {
  return () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    if (originalImageSrc) URL.revokeObjectURL(originalImageSrc);
  };
}, []);
```

### Modification 3 : Améliorer `ImageCropEditor.tsx` pour détecter les erreurs de chargement

Ajouter une gestion d'erreur sur le chargement de l'image :

```typescript
const [imageLoadError, setImageLoadError] = useState(false);
const [imageLoaded, setImageLoaded] = useState(false);

function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
  console.log('📸 [CropEditor] Image chargée avec succès');
  setImageLoaded(true);
  setImageLoadError(false);
  const { width, height } = e.currentTarget;
  setCrop(centerAspectCrop(width, height, 1));
}

function onImageError(e: React.SyntheticEvent<HTMLImageElement>) {
  console.error('📸 [CropEditor] Erreur chargement image:', e);
  setImageLoadError(true);
}

// Dans le JSX
<img
  ref={imgRef}
  alt="Crop me"
  src={imageSrc}
  style={{ maxWidth: '100%', maxHeight: '60vh', display: 'block' }}
  onLoad={onImageLoad}
  onError={onImageError}
/>

{imageLoadError && (
  <div className="text-center p-4">
    <p className="text-destructive">Impossible de charger l'image</p>
    <Button variant="outline" onClick={onClose}>Réessayer</Button>
  </div>
)}
```

### Modification 4 : Ajouter un état de chargement visible

Afficher un loader pendant que l'image charge :

```typescript
{!imageLoaded && !imageLoadError && (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
    <span className="ml-2">Chargement de l'image...</span>
  </div>
)}
```

## Résumé des modifications

| Fichier | Modification |
|---------|--------------|
| `src/components/ProfileSetupDialog.tsx` | Remplacer `FileReader.readAsDataURL()` par `URL.createObjectURL()` + cleanup mémoire |
| `src/components/ImageCropEditor.tsx` | Ajouter gestion d'erreur `onError` + état de chargement visible |

## Pourquoi cette solution fonctionne

1. **`URL.createObjectURL()`** crée une référence directe au fichier en mémoire, sans encodage base64
2. **Plus léger** : Pas de conversion, pas d'augmentation de taille
3. **Plus fiable** : Utilisé par la plupart des bibliothèques d'upload modernes
4. **Détection d'erreurs** : Si l'image ne charge pas, on le sait et on peut agir
5. **Cleanup mémoire** : Évite les fuites avec `URL.revokeObjectURL()`

## Impact sur les autres composants

Cette correction devrait aussi être appliquée à :
- `src/components/ProfileDialog.tsx` 
- `src/pages/Profile.tsx`
- `src/components/EditClubDialog.tsx`

Tous utilisent le même pattern `FileReader.readAsDataURL()` qui peut causer le même problème.
