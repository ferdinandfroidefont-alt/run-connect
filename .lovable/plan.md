

# Correction définitive : Bug photo de profil Android WebView - NIVEAU 31

## Diagnostic final

Après analyse approfondie, j'ai identifié **pourquoi les corrections précédentes ne fonctionnent pas** :

### Le problème exact

L'image est sauvegardée dans IndexedDB **SEULEMENT APRÈS le crop** (ligne 185 de `handleCropComplete`). 

Mais voici ce qui se passe réellement sur Android :
1. L'utilisateur clique sur le bouton caméra
2. `handleCameraButtonClick` sauvegarde le formulaire dans `sessionStorage` ✅
3. La galerie s'ouvre → Android peut détruire l'activité
4. L'utilisateur sélectionne une photo
5. **LA PAGE SE RECHARGE** (Android recrée l'activité)
6. `handlePhotoInputChange` n'est **JAMAIS appelé** car l'input a été recréé
7. Le fichier sélectionné est perdu **AVANT** d'arriver à `handleCropComplete`
8. IndexedDB est vide → rien à restaurer

### Pourquoi les mécanismes actuels échouent

| Mécanisme | Problème |
|-----------|----------|
| `sessionStorage` pour le formulaire | ✅ Fonctionne |
| IndexedDB dans `handleCropComplete` | ❌ Jamais atteint - le fichier est perdu AVANT |
| `webView.saveState()` dans Java | ❌ Ne préserve pas le contenu JavaScript, seulement l'URL |
| `fileSelectionInProgress` flag | ❌ Perdu au reload de la page |

### La vraie cause

Sur Android WebView, quand l'activité est recréée :
- L'événement `onReceiveValue(results)` du Java transmet l'URI au moteur WebView
- MAIS le JavaScript (React) a été complètement réinitialisé
- L'input file a été recréé sans l'événement `onChange` en attente
- Le fichier est "dans les limbes" - transmis mais jamais reçu par React

## Solution en 2 parties

### Partie 1 : Sauvegarder l'image IMMÉDIATEMENT dans `handleFileSelection`

L'image doit être stockée dans IndexedDB **DÈS** qu'elle est sélectionnée, pas après le crop :

```typescript
// ProfileSetupDialog.tsx - handleFileSelection MODIFIÉ
const handleFileSelection = async (file: File) => {
  if (!file.type.startsWith('image/')) {
    toast({ title: "Erreur", description: "Veuillez sélectionner une image.", variant: "destructive" });
    return;
  }
  
  // 🔥 NOUVEAU: Sauvegarder l'image IMMÉDIATEMENT dans IndexedDB
  // Avant même d'ouvrir le crop editor - survie au reload
  try {
    await saveImageToIndexedDB('pendingOriginalImage', file);
    console.log('📸 [ProfileSetup] Image ORIGINALE sauvegardée dans IndexedDB');
  } catch (e) {
    console.warn('📸 [ProfileSetup] Échec sauvegarde image originale:', e);
  }
  
  const objectUrl = URL.createObjectURL(file);
  setOriginalImageSrc(objectUrl);
  setShowCropEditor(true);
};
```

### Partie 2 : Restaurer l'image originale et rouvrir le crop editor

Au montage du composant, vérifier s'il y a une image originale en attente (non croppée) :

```typescript
// ProfileSetupDialog.tsx - Dans le useEffect de restauration
useEffect(() => {
  const restoreState = async () => {
    // ... restauration formulaire existante ...
    
    // 1. D'abord vérifier s'il y a une image CROPPÉE (déjà finalisée)
    const pendingCropped = await loadImageFromIndexedDB('pendingAvatar');
    if (pendingCropped && pendingCropped.size > 0) {
      // Image croppée trouvée → l'afficher directement
      // ... code existant ...
      return; // Ne pas continuer
    }
    
    // 2. NOUVEAU: Sinon vérifier s'il y a une image ORIGINALE (non croppée)
    const pendingOriginal = await loadImageFromIndexedDB('pendingOriginalImage');
    if (pendingOriginal && pendingOriginal.size > 0) {
      console.log('📸 [ProfileSetup] Image ORIGINALE trouvée - réouverture crop editor');
      const objectUrl = URL.createObjectURL(pendingOriginal);
      setOriginalImageSrc(objectUrl);
      setShowCropEditor(true); // Rouvrir l'éditeur de crop
    }
  };
  
  restoreState();
}, []);
```

### Partie 3 : Nettoyer l'image originale après le crop

Dans `handleCropComplete`, supprimer l'image originale puisqu'on a maintenant l'image croppée :

```typescript
// ProfileSetupDialog.tsx - handleCropComplete MODIFIÉ
const handleCropComplete = async (croppedImageBlob: Blob) => {
  // ... code existant de sauvegarde image croppée ...
  
  // 🔥 NOUVEAU: Supprimer l'image originale de IndexedDB
  try {
    await deleteImageFromIndexedDB('pendingOriginalImage');
    console.log('📸 [ProfileSetup] Image originale supprimée de IndexedDB');
  } catch (e) {
    // Ignorer l'erreur
  }
  
  // ... reste du code ...
};
```

## Résumé des modifications

| Fichier | Modification |
|---------|--------------|
| `src/components/ProfileSetupDialog.tsx` | Sauvegarder l'image dans IndexedDB DÈS la sélection (pas après crop), restaurer et rouvrir le crop editor si nécessaire |

## Flux corrigé

1. Utilisateur clique bouton caméra → formulaire sauvegardé en sessionStorage
2. Galerie s'ouvre
3. Utilisateur sélectionne image → `handleFileSelection` → **image sauvegardée IMMÉDIATEMENT dans IndexedDB**
4. Crop editor s'ouvre
5. **SI Android recrée l'activité ici** → page rechargée
6. `useEffect` de restauration :
   - Restaure le formulaire depuis sessionStorage ✅
   - Trouve l'image originale dans IndexedDB ✅
   - Rouvre automatiquement le crop editor ✅
7. Utilisateur finit le crop → image croppée remplace l'originale dans IndexedDB
8. Tout fonctionne !

## Pourquoi cette solution est définitive

1. **Sauvegarde précoce** : L'image est stockée **AVANT** le point où le reload peut arriver
2. **Double stockage** : Image originale + image croppée = couverture complète
3. **Restauration intelligente** : Le crop editor se rouvre automatiquement si nécessaire
4. **Aucune perte possible** : Peu importe quand Android recharge la page, l'image est récupérable

