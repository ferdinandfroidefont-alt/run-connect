
# Plan : Correction définitive de la sélection photo de profil sur Android

## Problème identifié

Le fichier sélectionné dans la galerie ne revient pas à l'application. L'erreur "aucune photo sélectionnée" s'affiche alors que l'utilisateur a bien choisi une image.

## Cause racine

Le code actuel dans `useCamera.tsx` crée un élément `<input type="file">` **dynamiquement** avec `document.createElement('input')`. Sur Android WebView, les inputs créés dynamiquement ont des problèmes de timing avec l'événement `onchange` - le callback WebView (`filePathCallback.onReceiveValue`) n'est pas correctement relié à l'input créé après coup.

**Ce qui fonctionne** : L'input "sélection alternative" dans `ProfileSetupDialog.tsx` qui est **déclaré directement dans le JSX React** avec un `ref` et un `onChange` standard.

## Solution : Utiliser un input React standard au lieu d'un input dynamique

### Approche

1. **Supprimer la création dynamique d'input** dans `useCamera.tsx`
2. **Utiliser un input React avec ref** dans `ProfileSetupDialog.tsx` comme méthode principale
3. **Le hook `useCamera` retourne une méthode qui accepte un inputRef** plutôt que de créer son propre input

### Modification 1 : Simplifier `ProfileSetupDialog.tsx`

Utiliser directement l'input React existant comme méthode principale (pas comme "alternative") :

```tsx
// Avant (bouton principal qui appelle useCamera)
<button onClick={handleSelectPhoto}>
  <Camera />
</button>

// Après (bouton principal qui clique directement sur l'input React)
<button onClick={() => fileInputRef.current?.click()}>
  <Camera />
</button>
```

Le flux devient :
1. Utilisateur clique sur l'icône caméra
2. L'input React natif (`ref={fileInputRef}`) reçoit le clic
3. Android `onShowFileChooser` s'ouvre
4. Utilisateur sélectionne une image
5. `filePathCallback.onReceiveValue(uri)` est appelé par Android
6. L'événement `onChange` de l'input React se déclenche
7. Le fichier est récupéré via `e.target.files[0]`

### Modification 2 : Mettre à jour `ProfileSetupDialog.tsx`

```typescript
// État pour le loading pendant la sélection
const [isSelectingPhoto, setIsSelectingPhoto] = useState(false);

// Handler simplifié qui utilise l'input React natif
const handlePhotoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  setIsSelectingPhoto(false);
  
  if (file) {
    console.log('📸 [ProfileSetup] Fichier reçu via input React:', file.name);
    handleFileSelection(file);
  } else {
    console.log('📸 [ProfileSetup] Aucun fichier sélectionné');
    toast({
      title: "Aucune photo",
      description: "Veuillez réessayer",
      variant: "destructive"
    });
  }
  
  // Reset l'input pour permettre de re-sélectionner le même fichier
  e.target.value = '';
};

// Clic sur le bouton principal
const handleCameraButtonClick = () => {
  setIsSelectingPhoto(true);
  fileInputRef.current?.click();
};
```

### Modification 3 : JSX mis à jour

```tsx
{/* Avatar avec bouton caméra */}
<div className="relative">
  <Avatar className="h-24 w-24 ring-4 ring-primary/20">
    <AvatarImage src={avatarPreview} />
    <AvatarFallback>...</AvatarFallback>
  </Avatar>
  <button
    type="button"
    onClick={handleCameraButtonClick}
    disabled={isSelectingPhoto}
    className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary flex items-center justify-center shadow-lg"
  >
    {isSelectingPhoto ? (
      <Loader2 className="h-4 w-4 text-white animate-spin" />
    ) : (
      <Camera className="h-4 w-4 text-white" />
    )}
  </button>
</div>

{/* Input React UNIQUE - C'est lui qui reçoit le fichier */}
<input
  ref={fileInputRef}
  type="file"
  accept="image/*"
  onChange={handlePhotoInputChange}
  className="hidden"
/>
```

### Modification 4 : Supprimer la dépendance à `useCamera` pour la galerie

Le hook `useCamera` reste disponible pour la prise de photo avec l'appareil photo, mais la sélection galerie utilise maintenant l'input React natif.

## Résumé des modifications

| Fichier | Modification |
|---------|--------------|
| `src/components/ProfileSetupDialog.tsx` | Remplacer l'appel à `selectFromGallery()` par un clic direct sur l'input React natif. Supprimer le bouton "sélection alternative" devenu inutile. |

## Pourquoi cette solution fonctionne

1. **Input dans le DOM React** : L'input est rendu par React et existe dans le DOM avant le clic - Android WebView le reconnaît correctement
2. **Pas de création dynamique** : Élimine les problèmes de timing entre `document.createElement` et `filePathCallback`
3. **onChange standard** : React gère correctement l'événement sans polling ni workarounds
4. **Testé fonctionnel** : Le bouton "sélection alternative" utilise cette même approche et fonctionne
5. **Simple et maintenable** : Code beaucoup plus simple, moins de risques de bugs

## Impact sur les autres composants

Le hook `useCamera` peut rester en place pour :
- La prise de photo avec l'appareil (`takePicture`)
- Les autres écrans qui utilisent déjà des inputs React natifs

Pour les autres composants qui utilisent `selectFromGallery`, la même approche peut être appliquée progressivement.
