

# Correction définitive : Bug photo de profil Android WebView

## Diagnostic approfondi (ce que j'ai trouvé)

Après analyse complète du code, j'ai identifié **la vraie cause racine** qui persiste malgré les corrections précédentes :

### LE VRAI PROBLÈME : WebView recharge la page quand on revient de la galerie

Sur Android WebView, quand l'application passe en arrière-plan (galerie ouverte) puis revient au premier plan, **le système Android peut "recréer" l'activité** si la mémoire est insuffisante. Cela cause :
1. La WebView recharge entièrement la page
2. Tous les états React sont perdus (y compris `avatarPreview`, `avatarFile`, etc.)
3. Le flag `fileSelectionInProgress` est perdu aussi

Le problème n'est pas dans le code JavaScript mais dans le **cycle de vie Android**. Les corrections précédentes protégeaient contre les reloads explicites mais pas contre la recréation d'activité.

### Preuve dans les logs Java (lignes 812-846)
```java
// onActivityResult reçoit bien le fichier
Log.d(TAG, "🖼️✅ [FILE CHOOSER] Fichier sélectionné: " + dataString);
filePathCallback.onReceiveValue(results); // L'URI est bien transmise
```

Le problème arrive **APRÈS** : la WebView reçoit le fichier mais React a été réinitialisé.

## Solution en 3 parties

### Partie 1 : Sauvegarder l'état du formulaire dans `sessionStorage` avant d'ouvrir la galerie

Avant d'ouvrir le file picker, sauvegarder tous les champs du formulaire :

```typescript
// ProfileSetupDialog.tsx - Dans handleCameraButtonClick
const handleCameraButtonClick = () => {
  // Sauvegarder l'état du formulaire AVANT d'ouvrir la galerie
  // (au cas où Android recrée l'activité)
  const formState = {
    username,
    displayName,
    birthDate,
    phone,
    bio,
    password,
    timestamp: Date.now()
  };
  sessionStorage.setItem('profileSetupFormState', JSON.stringify(formState));
  
  (window as any).fileSelectionInProgress = true;
  setIsSelectingPhoto(true);
  fileInputRef.current?.click();
};
```

### Partie 2 : Restaurer l'état du formulaire au montage du composant

Au montage, vérifier si un état sauvegardé existe et le restaurer :

```typescript
// ProfileSetupDialog.tsx - Nouveau useEffect
useEffect(() => {
  const savedState = sessionStorage.getItem('profileSetupFormState');
  if (savedState) {
    try {
      const formState = JSON.parse(savedState);
      // Vérifier que la sauvegarde est récente (moins de 5 minutes)
      if (Date.now() - formState.timestamp < 5 * 60 * 1000) {
        console.log('📸 [ProfileSetup] Restauration état formulaire depuis sessionStorage');
        setUsername(formState.username || '');
        setDisplayName(formState.displayName || '');
        setBirthDate(formState.birthDate || '');
        setPhone(formState.phone || '');
        setBio(formState.bio || '');
        setPassword(formState.password || '');
      }
    } catch (e) {
      console.error('Erreur restauration état:', e);
    }
    // Nettoyer après restauration
    sessionStorage.removeItem('profileSetupFormState');
  }
}, []);
```

### Partie 3 : Persister la photo sélectionnée dans `IndexedDB` (solution robuste)

Le `sessionStorage` ne peut pas stocker des fichiers. Pour la photo, on utilise une approche différente : stocker l'image dans IndexedDB avant le crop, et la restaurer si nécessaire.

```typescript
// Nouvelle fonction utilitaire pour sauvegarder/restaurer l'image
const saveImageToIndexedDB = async (key: string, blob: Blob): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ProfileSetupDB', 1);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images');
      }
    };
    request.onsuccess = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      const tx = db.transaction('images', 'readwrite');
      tx.objectStore('images').put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
};

const loadImageFromIndexedDB = async (key: string): Promise<Blob | null> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ProfileSetupDB', 1);
    request.onsuccess = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('images')) {
        resolve(null);
        return;
      }
      const tx = db.transaction('images', 'readonly');
      const getRequest = tx.objectStore('images').get(key);
      getRequest.onsuccess = () => resolve(getRequest.result || null);
      getRequest.onerror = () => reject(getRequest.error);
    };
    request.onerror = () => reject(request.error);
  });
};

// Dans handleCropComplete, sauvegarder l'image croppée
const handleCropComplete = async (croppedImageBlob: Blob) => {
  // Sauvegarder dans IndexedDB pour survie au reload
  await saveImageToIndexedDB('pendingAvatar', croppedImageBlob);
  // ... reste du code
};

// Au montage, vérifier s'il y a une image en attente
useEffect(() => {
  const restorePendingAvatar = async () => {
    const pendingBlob = await loadImageFromIndexedDB('pendingAvatar');
    if (pendingBlob) {
      console.log('📸 [ProfileSetup] Restauration avatar depuis IndexedDB');
      const file = new File([pendingBlob], 'avatar.jpg', { type: 'image/jpeg' });
      const previewUrl = URL.createObjectURL(pendingBlob);
      setAvatarFile(file);
      setAvatarPreview(previewUrl);
      avatarFileRef.current = file;
      avatarPreviewRef.current = previewUrl;
      // Nettoyer IndexedDB après restauration
      deleteImageFromIndexedDB('pendingAvatar');
    }
  };
  restorePendingAvatar();
}, []);
```

### Partie 4 : Empêcher Android de recréer l'activité (côté Java)

Dans `MainActivity.java`, ajouter un flag pour empêcher la destruction pendant la sélection de fichier :

```java
// MainActivity.java - Ajouter un flag
private boolean isFileChooserOpen = false;

// Dans onShowFileChooser
@Override
public boolean onShowFileChooser(...) {
    isFileChooserOpen = true;
    // ... reste du code
}

// Dans onActivityResult pour FILE_CHOOSER_REQUEST_CODE
if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
    isFileChooserOpen = false;
    // ... reste du code
}

// Modifier onSaveInstanceState pour préserver l'état WebView
@Override
protected void onSaveInstanceState(Bundle outState) {
    super.onSaveInstanceState(outState);
    if (webView != null && isFileChooserOpen) {
        webView.saveState(outState);
        Log.d(TAG, "💾 État WebView sauvegardé (file chooser ouvert)");
    }
}

// Restaurer l'état dans onCreate si disponible
if (savedInstanceState != null && webView != null) {
    webView.restoreState(savedInstanceState);
    Log.d(TAG, "💾 État WebView restauré depuis savedInstanceState");
}
```

## Résumé des modifications

| Fichier | Modification |
|---------|--------------|
| `src/components/ProfileSetupDialog.tsx` | Sauvegarder/restaurer état formulaire dans sessionStorage + image dans IndexedDB |
| `android/app/src/main/java/app/runconnect/MainActivity.java` | Gérer saveState/restoreState de WebView pendant file chooser |

## Pourquoi cette solution est définitive

1. **sessionStorage** : Survit aux reloads de page mais pas à la fermeture du navigateur/app - parfait pour notre cas
2. **IndexedDB** : Stockage persistant pour les fichiers binaires (images)
3. **WebView saveState** : Empêche Android de perdre l'état JavaScript pendant le file picker
4. **Double protection** : JavaScript ET Java travaillent ensemble

## Comportement attendu après correction

1. Utilisateur clique sur le bouton caméra
2. État du formulaire + flag sauvegardés
3. Galerie s'ouvre
4. Si Android recrée l'activité (mémoire) → WebView restaurée + état récupéré depuis sessionStorage/IndexedDB
5. Si pas de recréation → comportement normal
6. Photo sélectionnée → crop → preview affichée → tout fonctionne !

